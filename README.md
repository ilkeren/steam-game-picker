# 🎮 Steam Game Picker

Steam kütüphanenizdeki oyunlar arasından ne oynayacağınıza karar veremiyorsanız, rulet animasyonuyla rastgele oyun seçmenizi sağlayan modern bir web uygulaması.

---

## 🌟 Özellikler

- **Modern Steam arayüzü:** Koyu tema, neon detaylar, glassmorphism kartlar ve akıcı animasyonlar.
- **Tek oyunculu seçim:** Steam kütüphanenizden rastgele oyun seçimi.
- **Ortak kütüphane / Co-op Matchmaker:** İki Steam kullanıcısının ortak oyunlarını bulma ve birlikte oynanabilecek oyunlar arasından seçim yapma.
- **Ses efektleri:** Web Audio API ile rulet tıkırtıları ve kazanan oyun sesi; ses tercihi LocalStorage ile hatırlanır.
- **Esnek Steam kimliği girişi:** SteamID64, özel profil bağlantısı veya profil adı.
- **Steam OpenID 2.0:** Steam ile giriş.
- **Kütüphane filtreleri:** Tüm oyunlar, hiç oynanmayanlar, az oynananlar ve çok oynananlar.
- **Steam entegrasyonu:** Oyunları Steam istemcisinde başlatma ve mağaza sayfalarına gitme.
- **Örnek profiller:** Uygulamayı örnek kullanıcılarla deneme.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js, Axios, CORS, Dotenv
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **API:** Valve Steam Web API

---
### 🤖 Yapay Zekâ Destekli Geliştirme

Bu proje, yapay zekâ destekli geliştirme araçlarından yararlanılarak hazırlanmıştır.

**Kullanılan Yapay Zekâ Araçları:**
- **Google Antigravity:** Kod geliştirme, düzenleme ve proje yönetimi süreçlerinde kullanılmıştır.
- **Google Gemini:** Kodlama desteği, problem çözme ve hata ayıklama süreçlerinde yardımcı olmuştur.

Yapay zekâ araçları geliştirme sürecini desteklemek amacıyla kullanılmış; proje üzerinde yönlendirme, inceleme ve değerlendirme süreçleri yürütülmüştür.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Depoyu klonlayın ve bağımlılıkları yükleyin

```bash
git clone https://github.com/ilkeren/steam-game-picker.git
cd steam-game-picker
npm install
```

### 2. Ortam değişkenlerini ayarlayın

Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayın.

Windows:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Ardından `.env` dosyasını açıp kendi Steam Web API anahtarınızı girin:

```env
PORT=3000
STEAM_API_KEY=YOUR_STEAM_API_KEY
```

**Güvenlik:** Gerçek API anahtarınızı README dosyalarına, kaynak koduna veya Git geçmişine eklemeyin. `.env` dosyası Git tarafından izlenmemelidir. Yalnızca örnek değer içeren `.env.example` dosyasını paylaşın.

Steam Web API anahtarınızı resmi Steam sayfasından yönetebilirsiniz: https://steamcommunity.com/dev/apikey

### 3. Sunucuyu başlatın

```bash
npm start
```

Uygulamayı tarayıcıda açın: http://localhost:3000
