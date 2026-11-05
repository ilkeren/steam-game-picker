# 🎮 Steam Game Picker

Steam kütüphanenizdeki yüzlerce oyun arasından ne oynayacağınıza karar veremiyorsanız, rulet animasyonuyla rastgele oyun seçmenizi sağlayan modern, tam donanımlı Full-Stack web uygulaması.

---

## 🌟 Özellikler

- **Modern Steam Arayüzü (UI):** Steam'in resmi koyu lacivert tonları, neon mavi (`#66c0f4`) ve neon yeşil detaylar, glassmorphism kartlar ve akıcı animasyonlar.
- **Ortak Kütüphane / Arkadaşlar İle Oyun Seçimi (Co-Op Matchmaker):**
  - "Tek Kişilik Oyun Seç" ve "Ortak Oyun Seç (2 Oyuncu)" sekmeleriyle dilediğiniz modda arama.
  - İki arkadaşın Steam kimliğini girerek her iki oyuncuda da ortak olan oyunları otomatik tespit etme (`/api/common-games`).
  - **Akıllı Çok Oyunculu Filtresi:** Ortak oyun havuzundan yalnızca Singleplayer (Tek Oyunculu) olan oyunlar elenir; sadece her iki oyuncunun birlikte oynayabileceği Çok Oyunculu (Multiplayer / Co-Op / Online Co-op / PvP / Shared Screen) oyunlar rulet havuzuna alınır.
  - Ortak oyun havuzu üzerinden rulet çevirme ve her iki oyuncunun da sahip olduğu oyunlardan seçim yapma.
  - Ortak modda iki oyuncunun avatarları, profil linkleri ve her oyuncunun bireysel oynama saatleri.
  - Hızlı test için 100% herkese açık profillerle çalışan **"Örnek 2 Oyuncu ile Dene"** butonu (St4ck & ohjunior-).
- **Ses Efektleri ve Mute Kontrolü (Web Audio API):**
  - Üst barda (Header) şık Ses Açık / Ses Kapalı (Mute/Unmute) toggle butonu.
  - LocalStorage ile kullanıcının ses tercihi otomatik hatırlanır (Varsayılan: Açık).
  - Rulet dönerken çarkın yavaşlama fiziğine göre senkronize çalışan mekanik tıkırtı sesi (Tick Sound).
  - Kazanan oyun belirlendiğinde çalan zafer jingle'ı (Victory Sound).
- **Esnek Kimlik Girişi:**
  - 17 Haneli SteamID64 (örn: `76561198012345678`)
  - Özel Profil Linki (örn: `https://steamcommunity.com/id/kullaniciadi`)
  - Doğrudan özel profil adı (Vanity URL)
  - Tek tıkla resmi **Steam OpenID 2.0** ile giriş
  - Hızlı test için **Örnek Profille Dene** butonu
- **Akıcı Rulet / Shuffle Animasyonu:** "Rastgele Oyun Seç" butonuna basıldığında 2.8 saniye boyunca kütüphanenizdeki afişler slot makinesi gibi kayar, yavaşlar ve kazanan oyunda durur.
- **Dinamik Ses Efektleri:** Web Audio API ile harici dosya yükü olmadan çalışan mekanik çark tıkırtısı ve zafer jingle'ı.
- **Kütüphane Filtreleri:**
  - Tüm Oyunlar
  - Hiç Oynamadıklarım (0 Saat - Backlog temizliği için birebir!)
  - Az Oynadıklarım (< 5 Saat)
  - Çok Oynadıklarım (> 10 Saat)
- **Doğrudan Steam Entegrasyonu:**
  - `steam://run/{appid}` protokolü ile tek tıkla oyunu Steam istemcisinde başlatma
  - Resmi Steam Mağaza sayfasına doğrudan bağlantı
- **Gizlilik Rehberi:** Kütüphanesi gizli olan profiller için Türkçe adım adım gizlilik açma yönlendirmesi.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js, Axios, Cors, Dotenv
- **Frontend:** HTML5, Modern Vanilla CSS3, Vanilla JavaScript (ES6+)
- **API:** Valve Steam Web API (`IPlayerService/GetOwnedGames/v0001`, `ISteamUser/ResolveVanityURL/v0001`, `ISteamUser/GetPlayerSummaries/v0002`)

---

## 🚀 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin:
```bash
npm install
```

### 2. Ortam Değişkenlerini Yapılandırın:
Kök dizindeki `.env` dosyasını kontrol edin:
```env
PORT=3000
STEAM_API_KEY=[REDACTED]
```

### 3. Sunucuyu Başlatın:
```bash
npm start
```

### 4. Tarayıcınızda Açın:
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.
