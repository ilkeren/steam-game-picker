/**
 * Steam Game Picker - Production-Ready Backend Server
 * 
 * Güvenlik ve Mimari Sertleştirmeleri:
 * 1. Environment & Hassas Veri İzolasyonu (process.env, STEAM_API_KEY koruması)
 * 2. Express Güvenlik Middleware (Helmet, CSP, HSTS, CORS Allowlist)
 * 3. IP Bazlı İstek Sınırlaması (express-rate-limit - DDoS & Steam API Quota Koruması)
 * 4. Merkezi Hata Yönetimi (Global Error Handler - Production Information Disclosure Önleme)
 * 5. İstek Gövdesi Boyut Sınırlandırması (DoS Koruması)
 * 6. Steam OpenID 2.0 Doğrulaması (check_authentication)
 * 7. Bellek İçi Önbellek & Request Coalescing (Steam API Rate-Limit Koruması)
 */

'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const axios     = require('axios');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const { filterCommonMultiplayerGames } = require('./utils/multiplayerHelper');
const { STORE_EXPLORER_GAMES }         = require('./data/storeExplorerGames');

// ─── 1. Ortam Değişkenleri & Yapılandırma ──────────────────────────────────────
const PORT          = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV      = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const STEAM_API_KEY = (process.env.STEAM_API_KEY || '').trim();

// STEAM_API_KEY Eksiklik Kontrolü (Uygulamayı çökertmez, konsola belirgin uyarı basar)
if (!STEAM_API_KEY) {
  console.warn('\x1b[33m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  [GÜVENLİK VE YAPILANDIRMA UYARISI]');
  console.warn('\x1b[33m%s\x1b[0m', 'STEAM_API_KEY ortam değişkeni tanımlanmamış veya boş bırakılmış!');
  console.warn('\x1b[33m%s\x1b[0m', 'Steam Web API istekleri (kütüphane getirme, profil sorgulama)');
  console.warn('\x1b[33m%s\x1b[0m', 'başarısız olacaktır. Lütfen .env dosyanıza geçerli bir anahtar ekleyin:');
  console.warn('\x1b[33m%s\x1b[0m', 'STEAM_API_KEY=your_key_here (https://steamcommunity.com/dev/apikey)');
  console.warn('\x1b[33m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
}

// ─── 2. CORS Yapılandırması ───────────────────────────────────────────────────
// ALLOWED_ORIGIN ortam değişkenini oku (virgülle ayrılmış çoklu domain destekler)
const rawAllowedOrigin = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || '';
const configuredOrigins = rawAllowedOrigin
  ? rawAllowedOrigin.split(',').map(o => o.trim()).filter(Boolean)
  : [];

// Geliştirme ortamı için varsayılan yerel kökenler
const devLocalOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const allowedOriginsSet = new Set(
  IS_PRODUCTION ? configuredOrigins : [...devLocalOrigins, ...configuredOrigins]
);

function corsOptionsDelegate(req, callback) {
  const origin = req.headers.origin;

  // Origin başlığı olmayan istekler (aynı kökenli GET istekleri, sunucu-sunucu veya curl)
  if (!origin) {
    return callback(null, { origin: true, credentials: false });
  }

  // Canlı ortamda (production) ve ALLOWED_ORIGIN tanımlıysa strictly allowlist kontrolü
  if (allowedOriginsSet.has(origin)) {
    return callback(null, { origin: true, credentials: false });
  }

  // Geliştirme ortamında kolaylık sağla, ancak production'da kesinlikle engelle
  if (!IS_PRODUCTION) {
    return callback(null, { origin: true, credentials: false });
  }

  // Yetkisiz kökene CORS hatası fırlat
  const corsError = new Error(`CORS politikası ihlali: '${origin}' kökeninden erişim izni yok.`);
  corsError.status = 403;
  return callback(corsError);
}

// ─── 3. Express Uygulaması & Güvenlik Başlıkları ──────────────────────────────
const app = express();

// Production'da reverse proxy (Nginx, Cloudflare vb.) arkasındaysa gerçek istemci IP'sini al
app.set('trust proxy', 1);

// X-Powered-By başlığını kaldır (Express parmak izini gizler)
app.disable('x-powered-by');

// Helmet ile HTTP Güvenlik Başlıkları (CSP, HSTS, Referrer-Policy vb.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc:         ["'self'", 'https://cdn.akamai.steamstatic.com', 'https://steamcdn-a.akamaihd.net',
                       'https://media.steampowered.com', 'https://avatars.steamstatic.com', 'data:'],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'", 'https://steamcommunity.com'],
      upgradeInsecureRequests: IS_PRODUCTION ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Steam CDN resimlerinin COEP sebebiyle engellenmesini önler
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));

// CORS Middleware
app.use(cors(corsOptionsDelegate));

// ─── 4. İstek Sınırlamaları (Rate Limiting) ──────────────────────────────────
// Genel İstek Sınırlayıcı (DDoS ve Web Crawler Spam Koruması)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 300,                 // 15 dakikada IP başına maks 300 istek
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla istek gönderdiniz. Lütfen bir süre sonra tekrar deneyin.'
  }
});
app.use(globalLimiter);

// Hassas API İstek Sınırlayıcı (Steam Web API Kotalarını ve Sunucuyu Koruma)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30,             // Dakikada IP başına maks 30 API isteği
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'API istek sınırına ulaşıldı. Lütfen bir dakika bekleyip tekrar deneyin.'
  }
});

// Steam OpenID Kimlik Doğrulama Sınırlayıcı (Brute-Force & Flood Koruması)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10,             // Dakikada maks 10 oturum açma isteği
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi yapıldı. Lütfen biraz bekleyin.'
  }
});

// ─── 5. İstek Gövdesi Boyut Sınırlandırması (DoS Koruması) ────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 100 }));

// ─── 6. Statik Dosyalar ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: IS_PRODUCTION ? '1d' : '0',
  etag: true
}));

// ─── 7. Girdi Doğrulama ve Sanitizasyon Yardımcıları ─────────────────────────
const STEAM_ID64_RE    = /^[0-9]{17}$/;
const STEAM_PROFILE_RE = /^https:\/\/steamcommunity\.com\/(profiles\/[0-9]{17}|id\/[A-Za-z0-9_-]{2,32})\/?$/i;
const VANITY_RE        = /^[A-Za-z0-9_-]{2,32}$/;

/** Kullanıcı girdisini temizler ve uzunluk sınırlarını kontrol eder */
function sanitizeInput(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned || cleaned.length > 256) return null;
  return cleaned;
}

/** Steam profil URL veya SteamID64 formatını doğrular */
function validateSteamInput(input) {
  if (!input) return false;
  if (STEAM_ID64_RE.test(input)) return true;
  if (input.startsWith('http')) {
    return STEAM_PROFILE_RE.test(input);
  }
  if (input.includes('steamcommunity.com')) {
    return STEAM_PROFILE_RE.test(`https://${input}`) || STEAM_PROFILE_RE.test(input);
  }
  return VANITY_RE.test(input);
}

// ─── 8. Bellek İçi Önbellek (Steam API Kota ve Performans Optimizasyonu) ─────
class InMemoryCache {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttl   = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.ttl) });
  }

  has(key) { return this.get(key) !== null; }

  prune() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }
}

const libraryCache = new InMemoryCache(10 * 60 * 1000); // 10 dakika TTL
setInterval(() => libraryCache.prune(), 5 * 60 * 1000).unref();

// İstek Birleştirme (Request Coalescing): Aynı SteamID64 için eşzamanlı tek API çağrısı
const inflightLibrary = new Map();

// ─── 9. Axios İstek Yardımcısı (Retry + Backoff) ─────────────────────────────
async function axiosGetWithRetry(url, params, { maxRetries = 2, timeoutMs = 12000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { params, timeout: timeoutMs });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (attempt < maxRetries && (status === 429 || (status >= 500 && status < 600) || err.code === 'ECONNABORTED')) {
        const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
        const delay = retryAfter ? retryAfter * 1000 : Math.min(500 * Math.pow(2, attempt), 4000);
        await new Promise(r => setTimeout(r, delay));
      } else {
        break;
      }
    }
  }
  throw lastErr;
}

// ─── 10. SteamID64 Çözümleme Yardımcısı ───────────────────────────────────────
async function resolveToSteamId64(input) {
  if (!input) throw new Error('Lütfen bir Steam ID veya profil bağlantısı giriniz.');

  const cleanInput = sanitizeInput(input);
  if (!cleanInput) throw new Error('Geçersiz girdi formatı.');

  // 1. Doğrudan 17 haneli SteamID64
  if (STEAM_ID64_RE.test(cleanInput)) return cleanInput;

  // 2. URL içinde gömülü SteamID64
  const profileUrlMatch = cleanInput.match(/profiles\/([0-9]{17})/i);
  if (profileUrlMatch?.[1]) return profileUrlMatch[1];

  // 3. Özel profil URL veya vanity adı
  let vanityName = cleanInput;
  const vanityUrlMatch = cleanInput.match(/(?:steamcommunity\.com\/)?id\/([A-Za-z0-9_-]{2,32})/i);
  if (vanityUrlMatch?.[1]) {
    vanityName = vanityUrlMatch[1];
  } else if (cleanInput.includes('steamcommunity.com')) {
    throw new Error('Geçersiz Steam profil URL formatı. Lütfen resmi Steam profil linkini kullanın.');
  } else {
    vanityName = cleanInput.replace(/^https?:\/\/(www\.)?steamcommunity\.com\/(id\/)?/i, '').replace(/\/$/, '');
    if (!VANITY_RE.test(vanityName)) {
      throw new Error('Geçersiz Steam kullanıcı adı formatı (2-32 karakter, harf/rakam/alt çizgi/tire).');
    }
  }

  if (!STEAM_API_KEY) {
    throw new Error('Steam API anahtarı sunucuda tanımlanmamış.');
  }

  const vanityResponse = await axiosGetWithRetry(
    'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/',
    { key: STEAM_API_KEY, vanityurl: vanityName }
  );
  const data = vanityResponse.data?.response;
  if (data?.success === 1 && data.steamid) return data.steamid;

  throw new Error('Geçerli bir SteamID64 veya Steam profil linki bulunamadı. Lütfen kontrol edip tekrar deneyin.');
}

// ─── 11. Kullanıcı Kütüphanesini Getirme ─────────────────────────────────────
async function fetchUserLibrary(rawInput, playerLabel = 'Oyuncu') {
  if (!rawInput?.trim()) {
    throw { status: 400, message: `${playerLabel} için lütfen geçerli bir SteamID64, profil linki veya kullanıcı adı giriniz.` };
  }

  const trimmed = sanitizeInput(rawInput);
  if (!trimmed || !validateSteamInput(trimmed)) {
    throw { status: 400, message: `${playerLabel} için girdi formatı geçersiz. Lütfen doğru bir SteamID64, profil linki veya kullanıcı adı girin.` };
  }

  let steamId64;
  try {
    steamId64 = await resolveToSteamId64(trimmed);
  } catch (resolveErr) {
    throw { status: 400, message: `${playerLabel} için Steam hesabı bulunamadı: ${resolveErr.message}` };
  }

  // Önbellek kontrolü
  const cacheKey = `lib:${steamId64}`;
  const cached = libraryCache.get(cacheKey);
  if (cached) {
    if (cached._error) throw cached._error;
    return cached;
  }

  // Request Coalescing
  if (inflightLibrary.has(steamId64)) {
    return inflightLibrary.get(steamId64);
  }

  const fetchPromise = (async () => {
    try {
      const [gamesRes, playerRes] = await Promise.all([
        axiosGetWithRetry('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
          key: STEAM_API_KEY,
          steamid: steamId64,
          format: 'json',
          include_appinfo: true,
          include_played_free_games: true
        }, { timeoutMs: 15000 }),
        axiosGetWithRetry('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
          key: STEAM_API_KEY,
          steamids: steamId64
        }, { timeoutMs: 10000 }).catch(err => {
          console.warn(`${playerLabel} profil özeti alınamadı:`, err.message);
          return { data: { response: { players: [] } } };
        })
      ]);

      const gamesData  = gamesRes.data?.response;
      const playerData = playerRes.data?.response?.players?.[0] || null;

      if (!gamesData || typeof gamesData.game_count === 'undefined' || !Array.isArray(gamesData.games) || gamesData.games.length === 0) {
        const pName = playerData?.personaname ? `"${playerData.personaname}"` : playerLabel;
        const err = {
          status: 404,
          isPrivacy: true,
          steamId: steamId64,
          player: playerData ? {
            personaname: playerData.personaname,
            avatarfull:  playerData.avatarfull,
            profileurl:  playerData.profileurl
          } : null,
          message: `${pName} hesabının oyun kütüphanesi gizli veya kütüphanede oyun bulunmuyor. Steam Profil Ayarları > Gizlilik Ayarları bölümünden "Oyun Detayları"nın "Herkese Açık" (Public) olduğundan emin olun.`
        };
        libraryCache.set(cacheKey, { _error: err }, 2 * 60 * 1000);
        throw err;
      }

      const formattedGames = gamesData.games.map(game => ({
        appid:              game.appid,
        name:               game.name || 'Bilinmeyen Oyun',
        playtime_forever:   game.playtime_forever || 0,
        playtime_hours:    +((game.playtime_forever || 0) / 60).toFixed(1),
        playtime_2weeks:    game.playtime_2weeks ? +(game.playtime_2weeks / 60).toFixed(1) : 0,
        header_image:      `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        icon_url:           game.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
          : null,
        store_url:         `https://store.steampowered.com/app/${game.appid}/`,
        steam_store_url:   `steam://store/${game.appid}`,
        launch_url:        `steam://run/${game.appid}`
      }));

      const result = {
        steamId:    steamId64,
        totalGames: gamesData.game_count || formattedGames.length,
        player:     playerData ? {
          steamid:                   playerData.steamid,
          personaname:               playerData.personaname,
          avatar:                    playerData.avatarfull || playerData.avatar,
          profileurl:                playerData.profileurl,
          communityvisibilitystate:  playerData.communityvisibilitystate
        } : null,
        games: formattedGames
      };

      libraryCache.set(cacheKey, result);
      return result;
    } finally {
      inflightLibrary.delete(steamId64);
    }
  })();

  inflightLibrary.set(steamId64, fetchPromise);
  return fetchPromise;
}

// ─── 12. Controllers & API Uç Noktaları ───────────────────────────────────────

/** Tek Kişilik Kütüphane Sorgulama */
async function handleGamesRequest(req, res, next) {
  try {
    const rawInput = req.params.steamId || req.query.id || req.query.input;
    if (!rawInput) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir Steam ID, profil linki veya kullanıcı adı belirtin.'
      });
    }

    if (!STEAM_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Steam API entegrasyonu sunucu tarafında yapılandırılmamış (STEAM_API_KEY eksik).'
      });
    }

    const lib = await fetchUserLibrary(rawInput, 'Oyuncu');
    return res.json({
      success: true,
      mode: 'single',
      steamId: lib.steamId,
      total_games: lib.totalGames,
      player: lib.player,
      games: lib.games
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        isPrivacy: error.isPrivacy || false,
        steamId: error.steamId || null,
        player: error.player || null
      });
    }
    next(error);
  }
}

/** Ortak Kütüphane / Co-Op Eşleştirici */
async function handleCommonGamesRequest(req, res, next) {
  try {
    const player1Input = req.query.player1 || req.query.id1 || req.body?.player1 || req.body?.id1;
    const player2Input = req.query.player2 || req.query.id2 || req.body?.player2 || req.body?.id2;

    if (!player1Input || !player2Input) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen her iki oyuncu için de SteamID, profil linki veya kullanıcı adı giriniz.'
      });
    }

    if (!STEAM_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Steam API entegrasyonu sunucu tarafında yapılandırılmamış (STEAM_API_KEY eksik).'
      });
    }

    const [lib1, lib2] = await Promise.all([
      fetchUserLibrary(player1Input, '1. Oyuncu'),
      fetchUserLibrary(player2Input, '2. Oyuncu')
    ]);

    if (lib1.steamId === lib2.steamId) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen iki farklı Steam hesabı giriniz. Her iki alanda da aynı kullanıcı tespit edildi.'
      });
    }

    const lib2Map = new Map(lib2.games.map(g => [g.appid, g]));
    const commonGames = [];
    for (const game1 of lib1.games) {
      const game2 = lib2Map.get(game1.appid);
      if (game2) {
        const combinedPlaytime = (game1.playtime_forever || 0) + (game2.playtime_forever || 0);
        commonGames.push({
          appid:                   game1.appid,
          name:                    game1.name,
          header_image:            game1.header_image,
          icon_url:                game1.icon_url || game2.icon_url,
          store_url:               game1.store_url || `https://store.steampowered.com/app/${game1.appid}/`,
          steam_store_url:        `steam://store/${game1.appid}`,
          launch_url:              game1.launch_url || `steam://run/${game1.appid}`,
          playtime_forever:        combinedPlaytime,
          playtime_hours:         +(combinedPlaytime / 60).toFixed(1),
          player1_playtime_hours:  game1.playtime_hours,
          player2_playtime_hours:  game2.playtime_hours,
          player1_playtime_forever: game1.playtime_forever,
          player2_playtime_forever: game2.playtime_forever
        });
      }
    }

    if (commonGames.length === 0) {
      return res.status(404).json({
        success: false,
        mode: 'coop',
        player1: lib1.player,
        player2: lib2.player,
        message: `"${lib1.player?.personaname || '1. Oyuncu'}" ve "${lib2.player?.personaname || '2. Oyuncu'}" kütüphanelerinde ortak hiçbir oyun bulunamadı.`
      });
    }

    const multiplayerGames = await filterCommonMultiplayerGames(commonGames);

    if (multiplayerGames.length === 0) {
      return res.status(404).json({
        success: false,
        mode: 'coop',
        player1: lib1.player,
        player2: lib2.player,
        message: 'Seçilen oyuncuların kütüphanesinde birlikte oynanabilecek ortak çok oyunculu (Co-Op / Multiplayer) oyun bulunamadı!'
      });
    }

    return res.json({
      success: true,
      mode: 'coop',
      player1: lib1.player,
      player2: lib2.player,
      steamId1: lib1.steamId,
      steamId2: lib2.steamId,
      total_common_games: commonGames.length,
      total_multiplayer_games: multiplayerGames.length,
      games: multiplayerGames
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        isPrivacy: error.isPrivacy || false,
        player: error.player || null
      });
    }
    next(error);
  }
}

/** Steam Mağaza Keşif Sihirbazı (Store Explorer) */
function pickRandomExploreResult(chosenPool, fullFilteredList, isRelaxed = false, historyReset = false) {
  if (!fullFilteredList || fullFilteredList.length === 0) {
    return { success: false, message: 'Kriterlere uygun oyun bulunamadı.', totalMatched: 0, historyReset };
  }

  const pool = (chosenPool && chosenPool.length > 0) ? chosenPool : fullFilteredList;
  const chosenIndex = Math.floor(Math.random() * pool.length);
  const chosenGame = pool[chosenIndex];

  const others = fullFilteredList.filter(g => g.appid !== chosenGame.appid);
  const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
  const alternatives = shuffledOthers.slice(0, 3);

  return {
    success: true,
    totalMatched: fullFilteredList.length,
    remainingUnseen: Math.max(0, pool.length - 1),
    historyReset,
    isRelaxed,
    chosenGame,
    alternatives
  };
}

async function handleExploreGamesRequest(req, res, next) {
  try {
    const rawGenres   = req.query.genres || '';
    const rawPrice    = req.query.price || '';
    const rawMinPrice = req.query.minPrice;
    const rawMaxPrice = req.query.maxPrice;
    const rawPlayer   = req.query.playerMode || 'all';
    const rawMinScore = req.query.minScore || 'all';
    const rawExclude  = req.query.excludeAppIds || req.query.seen || '';

    const validPlayers = new Set(['all', 'single', 'multi']);
    const validScores  = new Set(['all', '80', '90']);

    const playerMode = validPlayers.has(rawPlayer) ? rawPlayer : 'all';
    const minScore   = validScores.has(rawMinScore) ? rawMinScore : 'all';

    const selectedGenres = typeof rawGenres === 'string' && rawGenres.trim()
      ? rawGenres.split(',').map(g => g.trim().toLowerCase()).filter(g => /^[a-z0-9_-]{1,24}$/.test(g))
      : [];

    let hasRange = false;
    let minPrice = 0;
    let maxPrice = 1500;

    if (rawMinPrice !== undefined || rawMaxPrice !== undefined) {
      hasRange = true;
      minPrice = Math.max(0, parseInt(rawMinPrice, 10) || 0);
      maxPrice = Math.max(minPrice, parseInt(rawMaxPrice, 10) || 1500);
    }

    const price = rawPrice;

    const excludeSet = new Set(
      String(rawExclude)
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(n => !isNaN(n) && n > 0)
    );

    let filtered = STORE_EXPLORER_GAMES.filter(game => {
      if (selectedGenres.length > 0) {
        const matchesGenre = selectedGenres.some(g =>
          game.genres.includes(g) ||
          game.tags.some(tag => tag.toLowerCase().includes(g))
        );
        if (!matchesGenre) return false;
      }

      const effectivePrice = game.price_type === 'free' ? 0 : (game.final_price_tl || 0);

      if (hasRange) {
        if (effectivePrice < minPrice) return false;
        if (maxPrice < 1500 && effectivePrice > maxPrice) return false;
        if (price === 'discount' && (game.discount_percent || 0) <= 0) return false;
      } else if (price) {
        if (price === 'free') {
          if (game.price_type !== 'free') return false;
        } else if (price === 'discount') {
          if ((game.discount_percent || 0) <= 0) return false;
        } else if (price === 'under500') {
          if (game.price_type !== 'free' && effectivePrice > 500) return false;
        } else if (price === 'under250') {
          if (game.price_type !== 'free' && effectivePrice > 250) return false;
        }
      }

      if (playerMode === 'single') {
        if (game.player_mode !== 'single' && game.player_mode !== 'both') return false;
      } else if (playerMode === 'multi') {
        if (game.player_mode !== 'multi' && game.player_mode !== 'both') return false;
      }

      if (minScore === '80') {
        if (game.review_score < 80) return false;
      } else if (minScore === '90') {
        if (game.review_score < 90) return false;
      }

      return true;
    });

    let isRelaxed = false;
    if (filtered.length === 0) {
      isRelaxed = true;
      filtered = STORE_EXPLORER_GAMES.filter(game => {
        if (hasRange && maxPrice < 200 && game.price_type !== 'free') return false;
        if (minScore === '90' && game.review_score < 85) return false;
        return true;
      });
      if (filtered.length === 0) {
        filtered = [...STORE_EXPLORER_GAMES];
      }
    }

    let historyReset = false;
    let chosenPool = filtered.filter(g => !excludeSet.has(g.appid));

    if (chosenPool.length === 0) {
      chosenPool = filtered;
      historyReset = true;
    }

    const responseData = pickRandomExploreResult(chosenPool, filtered, isRelaxed, historyReset);
    return res.json(responseData);

  } catch (error) {
    next(error);
  }
}

// ─── 13. Rota Tanımlamaları ───────────────────────────────────────────────────
app.get('/api/games',                 apiLimiter, handleGamesRequest);
app.get('/api/games/:steamId(*)',     apiLimiter, handleGamesRequest);
app.get('/api/common-games',          apiLimiter, handleCommonGamesRequest);
app.post('/api/common-games',         apiLimiter, handleCommonGamesRequest);
app.get('/api/explore-games',         apiLimiter, handleExploreGamesRequest);
app.get('/api/explore-games/catalog', apiLimiter, (req, res) => {
  res.json({
    success: true,
    count: STORE_EXPLORER_GAMES.length,
    games: STORE_EXPLORER_GAMES
  });
});

// ─── 14. Steam OpenID 2.0 Kimlik Doğrulama ───────────────────────────────────
app.get('/api/auth/steam', authLimiter, (req, res) => {
  const protocol = req.protocol;
  const host     = req.get('host');
  const returnTo = `${protocol}://${host}/api/auth/steam/return`;
  const realm    = `${protocol}://${host}/`;

  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  returnTo,
    'openid.realm':      realm,
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });

  res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
});

app.get('/api/auth/steam/return', authLimiter, async (req, res) => {
  const query     = req.query;
  const mode      = query['openid.mode'];
  const claimedId = query['openid.claimed_id'];

  if (mode !== 'id_res' || !claimedId) {
    return res.redirect('/?error=steam_auth_failed');
  }

  const idMatch = claimedId.match(/\/id\/([0-9]{17})$/);
  if (!idMatch?.[1]) {
    return res.redirect('/?error=steam_auth_failed');
  }
  const steamId64 = idMatch[1];

  try {
    const verifyParams = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    );
    verifyParams.set('openid.mode', 'check_authentication');

    const verifyRes = await axiosGetWithRetry(
      'https://steamcommunity.com/openid/login',
      Object.fromEntries(verifyParams.entries()),
      { timeoutMs: 8000, maxRetries: 1 }
    );

    const responseText = verifyRes.data || '';
    if (typeof responseText === 'string' && responseText.includes('is_valid:true')) {
      return res.redirect(`/?steamId=${encodeURIComponent(steamId64)}`);
    } else {
      console.warn('Steam OpenID doğrulaması reddedildi:', responseText);
      return res.redirect('/?error=steam_auth_failed');
    }
  } catch (err) {
    console.error('Steam OpenID check_authentication hatası:', err.message);
    return res.redirect('/?error=steam_auth_failed');
  }
});

// ─── 15. Bulunamayan API Rotaları (404 Handler) ──────────────────────────────
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'İstenen API uç noktası bulunamadı.'
  });
});

// ─── 16. Merkezi Hata Yakalama Middleware'i (Global Error Handler) ───────────
// Express hata middleware'i tam 4 parametre almak zorundadır: (err, req, res, next)
app.use((err, req, res, _next) => {
  // CORS Hataları
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  // İstek Gövdesi Boyut Aşımı (Payload Too Large)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'İstek boyutu izin verilen sınırı aşıyor (Maks 10KB).'
    });
  }

  // Sunucu İçi Hata Loglama (Sunucu konsolunda güvenli detay tutulur)
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [SUNUCU HATASI] ${req.method} ${req.originalUrl}:`, err.message);

  if (!IS_PRODUCTION && err.stack) {
    console.error(err.stack);
  }

  // HTTP Durum Kodu Belirleme
  const statusCode = err.status || err.statusCode || 500;

  // Production Ortamında Hassas Hata Bilgisi Gizleme (Information Disclosure Koruması)
  if (IS_PRODUCTION) {
    // 4xx istemci hatalarında güvenli mesajı döndür; 5xx sunucu hatalarında jenerik mesaj ver
    const safeMessage = (statusCode >= 400 && statusCode < 500)
      ? err.message
      : '500 - Sunucu Hatası';

    return res.status(statusCode).json({
      success: false,
      message: safeMessage
    });
  }

  // Development Ortamında Hata Detaylarını ve Stack Trace'i Döndür
  return res.status(statusCode).json({
    success: false,
    message: err.message || '500 - Sunucu Hatası',
    stack: err.stack
  });
});

// ─── 17. Sunucuyu Başlat ──────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log('🚀 Steam Game Picker Sunucusu Başarıyla Başlatıldı!');
  console.log(`🌍 Ortam (NODE_ENV)  : ${NODE_ENV}`);
  console.log(`🌐 Sunucu Adresi     : http://localhost:${PORT}`);
  console.log(`🎮 Steam API Durumu  : ${STEAM_API_KEY ? 'Tanımlı (Aktif)' : '⚠️  EKSİK (Konsoldaki uyarıyı inceleyin)'}`);
  console.log(`🔒 Güvenlik Katmanı  : Helmet (CSP/HSTS), Rate Limit, CORS Allowlist Aktif`);
  console.log('================================================================');
});

// Graceful Shutdown (Kibarca Kapanma Desteği)
function handleShutdown(signal) {
  console.log(`\n${signal} sinyali alındı. Sunucu güvenli şekilde kapatılıyor...`);
  server.close(() => {
    console.log('Sunucu bağlantıları temizlendi. Çıkış yapılıyor.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
