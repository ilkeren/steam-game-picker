/**
 * Steam Game Picker - Multiplayer / Co-Op Filtreleme Modülü
 * PERF-02: Limitli eşzamanlılık kuyruğu (concurrency: 8)
 * PERF-03: Tamamen bellek tabanlı async önbellekleme (senkron fs kaldırıldı)
 * PERF-04: 3 durum modeli → 'multiplayer' | 'not-multiplayer' | 'unknown'
 */

'use strict';

const axios = require('axios');

// ─── Steam Resmi Çok Oyunculu Kategori ID'leri ───────────────────────────────
const MULTIPLAYER_CATEGORY_IDS = new Set([
  1,  // Multi-player
  9,  // Co-op
  24, // Shared/Split Screen
  27, // Cross-Platform Multiplayer
  36, // Online PvP
  37, // Shared/Split Screen PvP
  38, // Online Co-op
  39, // Shared/Split Screen Co-op
  47, // LAN Co-op
  48, // LAN PvP
  49  // PvP
]);

const MULTIPLAYER_REGEX = /multi-?player|co-?op|pvp|shared\/split screen|cross-platform multiplayer/i;

// ─── Bellek İçi TTL Önbellek (PERF-03 — senkron fs yok) ─────────────────────
const ONE_HOUR_MS = 60 * 60 * 1000;
const SHORT_TTL   = 15 * 60 * 1000; // Hatalı/bilinmeyen sonuçlar için kısa TTL (PERF-04)

class MemoryCacheTTL {
  constructor(defaultTTL = ONE_HOUR_MS) {
    this.defaultTTL = defaultTTL;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(String(key));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.store.delete(String(key)); return undefined; }
    return entry.data;
  }

  set(key, data, ttlMs = this.defaultTTL) {
    this.store.set(String(key), { data, expiresAt: Date.now() + ttlMs });
  }

  has(key) { return this.get(key) !== undefined; }
  size()   { return this.store.size; }

  prune() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }
}

const memoryCache = new MemoryCacheTTL(ONE_HOUR_MS);
// Periyodik temizlik (her 10 dakikada bir)
setInterval(() => memoryCache.prune(), 10 * 60 * 1000).unref();

// ─── Eşzamanlılık Kuyruğu (PERF-02 — Concurrency Limiter) ───────────────────
class ConcurrencyQueue {
  constructor(limit = 8) {
    this.limit   = limit;
    this.running = 0;
    this.queue   = [];
  }

  run(fn) {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.running++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            this.queue.shift()();
          }
        }
      };
      if (this.running < this.limit) {
        task();
      } else {
        this.queue.push(task);
      }
    });
  }
}

const concurrencyQueue = new ConcurrencyQueue(8);

// ─── Üstel Geri Çekilme ile Axios GET (PERF-02 — retry + 429 Retry-After) ───
async function axiosGetWithRetry(url, params, { maxRetries = 2, timeoutMs = 4000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { params, timeout: timeoutMs });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (attempt < maxRetries && (status === 429 || (status >= 500 && status < 600) || err.code === 'ECONNABORTED')) {
        const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
        const delay = retryAfter ? retryAfter * 1000 : Math.min(400 * Math.pow(2, attempt), 3000);
        await new Promise(r => setTimeout(r, delay));
      } else {
        break;
      }
    }
  }
  throw lastErr;
}

// ─── Kategori Analizi ─────────────────────────────────────────────────────────
/**
 * Kategorilere bakarak oyunun multiplayer durumunu belirler.
 * @returns {{ status: 'multiplayer'|'not-multiplayer'|'unknown', categories: string[] }}
 */
function analyzeMultiplayer(categories, gameName = '') {
  const matched = [];

  if (Array.isArray(categories) && categories.length > 0) {
    for (const cat of categories) {
      const id   = typeof cat === 'object' ? cat.id   : null;
      const desc = typeof cat === 'object' ? (cat.description || '') : String(cat);
      if ((id && MULTIPLAYER_CATEGORY_IDS.has(id)) || MULTIPLAYER_REGEX.test(desc)) {
        matched.push(desc);
      }
    }

    if (matched.length > 0) {
      return { status: 'multiplayer', categories: Array.from(new Set(matched)) };
    }

    const isSingle = categories.some(c => (c.id === 2 || /single-?player/i.test(c.description || c)));
    if (isSingle) {
      return { status: 'not-multiplayer', categories: ['Single-player'] };
    }
  }

  // İsim tabanlı yedek sezgisel kontrol
  const multiKeywords = /\b(multiplayer|deathmatch|co-op|coop|online|party|together|arena|versus|pvp|battlegrounds|battle royale|showdown)\b/i;
  if (multiKeywords.test(gameName)) {
    return { status: 'multiplayer', categories: ['Multiplayer (İsim Tespiti)'] };
  }

  return { status: 'unknown', categories: [] };
}

// ─── Tekil Oyun Kategori Çekicisi ─────────────────────────────────────────────
/**
 * Bir oyunun multiplayer durumunu döndürür.
 * PERF-04: 3 durum modeli; 'unknown' geçici hataları kısa TTL ile önbellekler.
 * @returns {{ status: 'multiplayer'|'not-multiplayer'|'unknown', categories: string[] }}
 */
async function fetchGameMultiplayerStatus(appid, gameName = '') {
  const key    = String(appid);
  const cached = memoryCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await axiosGetWithRetry(
      'https://store.steampowered.com/api/appdetails',
      { appids: appid, filters: 'categories' },
      { timeoutMs: 3500, maxRetries: 2 }
    );

    const appData        = res.data?.[appid]?.data;
    const rawCategories  = appData?.categories || [];
    const analysis       = analyzeMultiplayer(rawCategories, gameName);

    // 'unknown' — API yanıt verdi ama kategori yok; uzun TTL ile önbellekle (nihai durum)
    // 'multiplayer' / 'not-multiplayer' — kesin durum; uzun TTL
    memoryCache.set(key, analysis, ONE_HOUR_MS);
    return analysis;

  } catch (err) {
    // API hatası → isim kontrolü dene
    const nameAnalysis = analyzeMultiplayer([], gameName);

    if (nameAnalysis.status === 'multiplayer') {
      // İsimden tespit → güvenilir, uzun TTL
      memoryCache.set(key, nameAnalysis, ONE_HOUR_MS);
      return nameAnalysis;
    }

    // Belirsiz durum → kısa TTL ile önbellekle (PERF-04)
    const unknownResult = { status: 'unknown', categories: [] };
    memoryCache.set(key, unknownResult, SHORT_TTL);
    return unknownResult;
  }
}

// ─── Ana Filtreleme Fonksiyonu (PERF-02 concurrency limiter) ─────────────────
/**
 * Ortak oyunlar arasından multiplayer olanları filtreler.
 * PERF-04: 'unknown' durumundaki oyunlar sonuç dışı tutulur (hata kaynaklı atlanma).
 * @param {Array} commonGames - İki oyuncunun ortak oyunları
 * @returns {Promise<Array>} Yalnızca is_multiplayer===true olan oyunlar
 */
async function filterCommonMultiplayerGames(commonGames) {
  if (!commonGames || commonGames.length === 0) return [];

  const confirmed   = []; // multiplayer
  const toFetch     = []; // önbelleksiz

  // 1. ADIM: Önbellek taraması
  for (const game of commonGames) {
    const cached = memoryCache.get(String(game.appid));
    if (cached !== undefined) {
      if (cached.status === 'multiplayer') {
        confirmed.push({
          ...game,
          is_multiplayer: true,
          multiplayer_categories: cached.categories.length > 0 ? cached.categories : ['Çok Oyunculu']
        });
      }
      // 'not-multiplayer' ve 'unknown' → atla
    } else {
      toFetch.push(game);
    }
  }

  // 2. ADIM: Önbelleksiz oyunları limitli eşzamanlılık kuyruğuyla çek
  if (toFetch.length > 0) {
    const results = await Promise.all(
      toFetch.map(game =>
        concurrencyQueue.run(async () => {
          const info = await fetchGameMultiplayerStatus(game.appid, game.name);
          if (info.status === 'multiplayer') {
            return {
              ...game,
              is_multiplayer: true,
              multiplayer_categories: info.categories.length > 0 ? info.categories : ['Çok Oyunculu']
            };
          }
          return null; // 'not-multiplayer' veya 'unknown' — dahil etme
        })
      )
    );

    for (const r of results) {
      if (r) confirmed.push(r);
    }
  }

  return confirmed;
}

module.exports = {
  filterCommonMultiplayerGames,
  fetchGameMultiplayerStatus,
  analyzeMultiplayer,
  memoryCache
};
