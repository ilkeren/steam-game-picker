/**
 * Steam Game Picker - İstemci Taraflı JavaScript Mantığı
 * SEC-02: DOM XSS koruması — innerHTML kullanımı kaldırıldı, textContent / replaceChildren / DOM API kullanıldı
 * Modern Vanilla JS, Web Audio API Ses Efektleri, Mute Kontrolü, Co-Op Matchmaker ve Rulet Animasyonu
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Backend Sunucu Adresi Tespiti ---
  const isFileProtocol = window.location.protocol === 'file:';
  const API_BASE = (isFileProtocol || (window.location.port !== '3000' && window.location.hostname === 'localhost'))
    ? 'http://localhost:3000'
    : '';

  // Eğer sayfa file:// üzerinden açılmışsa Steam butonunun linkini mutlak adrese çevir
  const steamOpenIdBtn = document.getElementById('steamOpenIdBtn');
  if (steamOpenIdBtn) {
    steamOpenIdBtn.href = `${API_BASE || 'http://localhost:3000'}/api/auth/steam`;
  }

  // File protokolü uyarısı
  const localHostNotice = document.getElementById('localHostNotice');
  if (isFileProtocol && localHostNotice) {
    localHostNotice.classList.remove('hidden');
  }

  // --- DOM Element Referansları ---
  // Ses Efektleri ve Mute Kontrolü
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const soundText = document.getElementById('soundText');

  // Mod Seçimi Sekmeleri (Tek Kişilik vs Ortak Oyun)
  const singleModeTab = document.getElementById('singleModeTab');
  const coopModeTab = document.getElementById('coopModeTab');
  const cardHeaderTitle = document.getElementById('cardHeaderTitle');
  const cardHeaderBadge = document.getElementById('cardHeaderBadge');

  // Ana Navigasyon Modu (Kütüphanemden Seç vs Steam Mağazasında Keşfet)
  const navLibraryModeBtn = document.getElementById('navLibraryModeBtn');
  const navExplorerModeBtn = document.getElementById('navExplorerModeBtn');
  const explorerSection = document.getElementById('explorerSection');
  const explorerLoadingSection = document.getElementById('explorerLoadingSection');
  const explorerResultSection = document.getElementById('explorerResultSection');
  const exploreGameBtn = document.getElementById('exploreGameBtn');
  const reExploreBtn = document.getElementById('reExploreBtn');
  const changeCriteriaBtn = document.getElementById('changeCriteriaBtn');

  // Keşif Sihirbazı Çip Grupları
  const genreChipsGroup = document.getElementById('genreChipsGroup');
  const playerModeChipsGroup = document.getElementById('playerModeChipsGroup');
  const minScoreChipsGroup = document.getElementById('minScoreChipsGroup');

  // Keşif Fiyat Dual Range Slider Elemanları
  const minPriceInput   = document.getElementById('minPriceInput');
  const maxPriceInput   = document.getElementById('maxPriceInput');
  const minPriceDisplay = document.getElementById('minPriceDisplay');
  const maxPriceDisplay = document.getElementById('maxPriceDisplay');
  const rangeHighlight  = document.getElementById('rangeHighlight');
  const quickPriceChips = document.getElementById('quickPriceChips');

  // Keşif Sonuç Kartı Elemanları
  const explorerResultCard = document.getElementById('explorerResultCard');
  const explorerPosterBackdrop = document.getElementById('explorerPosterBackdrop');
  const explorerGameImage = document.getElementById('explorerGameImage');
  const explorerGameTitle = document.getElementById('explorerGameTitle');
  const explorerPriceBadge = document.getElementById('explorerPriceBadge');
  const explorerPriceText = document.getElementById('explorerPriceText');
  const explorerReviewBadge = document.getElementById('explorerReviewBadge');
  const explorerReviewText = document.getElementById('explorerReviewText');
  const explorerTagsRow = document.getElementById('explorerTagsRow');
  const explorerGameDesc = document.getElementById('explorerGameDesc');
  const explorerMetaPrice = document.getElementById('explorerMetaPrice');
  const explorerMetaPlayerMode = document.getElementById('explorerMetaPlayerMode');
  const explorerAppId = document.getElementById('explorerAppId');
  const explorerStoreBtn = document.getElementById('explorerStoreBtn');
  const explorerSteamStoreBtn = document.getElementById('explorerSteamStoreBtn');
  const explorerAlternativesContainer = document.getElementById('explorerAlternativesContainer');
  const explorerAlternativesGrid = document.getElementById('explorerAlternativesGrid');

  // Form Elemanları (Tek Kişilik)
  const singleFormContent = document.getElementById('singleFormContent');
  const steamInput = document.getElementById('steamInput');
  const fetchGamesBtn = document.getElementById('fetchGamesBtn');
  const demoProfileBtn = document.getElementById('demoProfileBtn');

  // Form Elemanları (Co-Op / Ortak Oyun)
  const coopFormContent = document.getElementById('coopFormContent');
  const coopInput1 = document.getElementById('coopInput1');
  const coopInput2 = document.getElementById('coopInput2');
  const fetchCommonGamesBtn = document.getElementById('fetchCommonGamesBtn');
  const demoCoopBtn = document.getElementById('demoCoopBtn');

  // Yükleme & Hata Bildirimleri
  const loadingSection = document.getElementById('loadingSection');
  const loadingText = document.getElementById('loadingText');
  const loadingSub = document.getElementById('loadingSub');
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const privacyHelp = document.getElementById('privacyHelp');
  const closeErrorBtn = document.getElementById('closeErrorBtn');

  // Dashboard & Profil Çubukları
  const profileDashboard = document.getElementById('profileDashboard');
  const searchSection = document.getElementById('searchSection');

  // Tek Kişilik Profil Çubuğu
  const singleProfileBar = document.getElementById('singleProfileBar');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userProfileLink = document.getElementById('userProfileLink');
  const statGameCount = document.getElementById('statGameCount');
  const statTotalHours = document.getElementById('statTotalHours');
  const changeAccountBtn = document.getElementById('changeAccountBtn');

  // Ortak Oyun (Co-Op) Profil Çubuğu
  const coopProfileBar = document.getElementById('coopProfileBar');
  const coopAvatar1 = document.getElementById('coopAvatar1');
  const coopName1 = document.getElementById('coopName1');
  const coopProfileLink1 = document.getElementById('coopProfileLink1');
  const coopAvatar2 = document.getElementById('coopAvatar2');
  const coopName2 = document.getElementById('coopName2');
  const coopProfileLink2 = document.getElementById('coopProfileLink2');
  const coopCommonCount = document.getElementById('coopCommonCount');
  const changeCoopAccountBtn = document.getElementById('changeCoopAccountBtn');

  // Filtreleme
  const filterButtons = document.querySelectorAll('.filter-chip, .filter-btn');
  const filterSlider = document.getElementById('filterSlider');
  const filterSegmented = document.querySelector('.filter-segmented');
  const filterAllLabel = document.getElementById('filterAllLabel');
  const filterUnplayedLabel = document.getElementById('filterUnplayedLabel');
  const filterLowLabel = document.getElementById('filterLowLabel');
  const filterPlayedLabel = document.getElementById('filterPlayedLabel');
  const filterAllCount = document.getElementById('filterAllCount');
  const filterUnplayedCount = document.getElementById('filterUnplayedCount');
  const filterLowCount = document.getElementById('filterLowCount');
  const filterPlayedCount = document.getElementById('filterPlayedCount');

  // --- Kayan Aktif Arka Plan (Animated Active Slider/Pill) Konumlandırma ---
  function updateFilterSlider() {
    if (!filterSlider || !filterSegmented) return;
    const activeBtn = filterSegmented.querySelector('.filter-chip.active, .filter-btn.active');
    if (!activeBtn) return;
    const left = activeBtn.offsetLeft;
    const width = activeBtn.offsetWidth;
    if (width > 0) {
      filterSlider.style.transform = `translateX(${left}px)`;
      filterSlider.style.width = `${width}px`;
      filterSlider.style.opacity = '1';
    }
  }

  // Rulet Sahnesi
  const pickGameBtn = document.getElementById('pickGameBtn');
  const rouletteSection = document.getElementById('rouletteSection');
  const rouletteTrack = document.getElementById('rouletteTrack');

  // Sonuç Kartı
  const resultSection = document.getElementById('resultSection');
  const resultCelebrationText = document.getElementById('resultCelebrationText');
  const resultGameImage = document.getElementById('resultGameImage');
  const resultGameTitle = document.getElementById('resultGameTitle');
  const resultCoopBadge = document.getElementById('resultCoopBadge');
  const resultCategoriesRow = document.getElementById('resultCategoriesRow');
  const resultTotalTimeBox = document.getElementById('resultTotalTimeBox');
  const resultTotalTimeLabel = document.getElementById('resultTotalTimeLabel');
  const resultTotalTime = document.getElementById('resultTotalTime');
  const resultRecentTimeBox = document.getElementById('resultRecentTimeBox');
  const resultRecentTime = document.getElementById('resultRecentTime');
  const resultCoopPlayer1Box = document.getElementById('resultCoopPlayer1Box');
  const resultCoopPlayer2Box = document.getElementById('resultCoopPlayer2Box');
  const resultPlayer1Label = document.getElementById('resultPlayer1Label');
  const resultPlayer2Label = document.getElementById('resultPlayer2Label');
  const resultPlayer1Time = document.getElementById('resultPlayer1Time');
  const resultPlayer2Time = document.getElementById('resultPlayer2Time');
  const resultAppId = document.getElementById('resultAppId');
  const resultPlaytimeTag = document.getElementById('resultPlaytimeTag');
  const resultLaunchBtn = document.getElementById('resultLaunchBtn');
  const resultStoreBtn = document.getElementById('resultStoreBtn');
  const resultSteamStoreBtn = document.getElementById('resultSteamStoreBtn');
  const rePickBtn = document.getElementById('rePickBtn');

  // --- Uygulama Durumu (State) ---
  let currentMode = 'single'; // 'single' | 'coop'
  let allGames = [];
  let currentFilteredGames = [];
  let activeFilter = 'all';
  let isRolling = false;
  let audioCtx = null;
  let singlePlayer = null;
  let coopPlayer1 = null;
  let coopPlayer2 = null;

  // Ses Durumu (LocalStorage ile kalıcı, varsayılan: AÇIK)
  let isSoundMuted = false;
  try {
    const savedMuteState = localStorage.getItem('steam_game_picker_muted');
    if (savedMuteState !== null) {
      isSoundMuted = savedMuteState === 'true';
    }
  } catch (e) { }

  // ─── XSS Güvenli DOM Yardımcıları (SEC-02) ─────────────────────────────────
  /**
   * Verilen parent'ın içeriğini güvenli DOM düğümleriyle değiştirir.
   * @param {Element} parent - Hedef kapsayıcı element
   * @param {Array<Node|string>} nodes - Eklenecek TextNode veya Element listesi
   */
  function safeReplaceChildren(parent, ...nodes) {
    if (!parent) return;
    parent.replaceChildren(...nodes.map(n =>
      (n instanceof Node) ? n : document.createTextNode(String(n))
    ));
  }

  /** FontAwesome ikonu için güvenli Element oluşturur */
  function makeIcon(faClass) {
    const i = document.createElement('i');
    i.className = faClass;
    return i;
  }

  /** Güvenli şekilde bir element oluşturur ve textContent atar */
  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  // ─── Web Audio API: Ses Efektleri ──────────────────────────────────────────
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function updateSoundUI() {
    if (!soundToggleBtn) return;
    if (isSoundMuted) {
      soundToggleBtn.classList.add('is-muted');
      if (soundIcon) soundIcon.className = 'fa-solid fa-volume-xmark';
      if (soundText) soundText.textContent = 'Ses Kapalı';
      soundToggleBtn.title = 'Ses Efektleri: Kapalı (Açmak için tıklayın)';
      soundToggleBtn.setAttribute('aria-label', 'Sesleri Aç');
    } else {
      soundToggleBtn.classList.remove('is-muted');
      if (soundIcon) soundIcon.className = 'fa-solid fa-volume-high';
      if (soundText) soundText.textContent = 'Ses Açık';
      soundToggleBtn.title = 'Ses Efektleri: Açık (Kapatmak için tıklayın)';
      soundToggleBtn.setAttribute('aria-label', 'Sesleri Kapat');
    }
  }

  function toggleSound() {
    isSoundMuted = !isSoundMuted;
    try { localStorage.setItem('steam_game_picker_muted', isSoundMuted ? 'true' : 'false'); } catch (e) { }
    updateSoundUI();
    if (!isSoundMuted) playBlipSound();
  }

  function playBlipSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) { }
  }

  function scheduleRouletteSounds(durationSec = 2.8) {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const startTime = ctx.currentTime + 0.03;
      let time = startTime;
      let interval = 0.045;
      const maxInterval = 0.28;
      while (time < startTime + durationSec) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, time);
        osc.frequency.exponentialRampToValueAtTime(75, time + 0.032);
        gain.gain.setValueAtTime(0.09, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.032);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.032);
        const progress = (time - startTime) / durationSec;
        interval = 0.045 + Math.pow(progress, 2.3) * (maxInterval - 0.045);
        time += interval;
      }
    } catch (e) { }
  }

  // Modern Fütüristik "Dijital Tarama / Radar Pulse" Ses Efekti (Mağaza Keşif Modu)
  function scheduleRadarScanSounds(durationSec = 2.4) {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const startTime = ctx.currentTime + 0.02;

      // 4 periyotluk dijital veri analizi ve yumuşak radar sonar sweep nabızları
      const pulses = [
        { time: 0.00, startFreq: 420, endFreq: 840, dur: 0.45, gain: 0.07 },
        { time: 0.60, startFreq: 520, endFreq: 980, dur: 0.45, gain: 0.08 },
        { time: 1.20, startFreq: 640, endFreq: 1180, dur: 0.48, gain: 0.09 },
        { time: 1.75, startFreq: 820, endFreq: 1350, dur: 0.38, gain: 0.07 }
      ];

      pulses.forEach(({ time, startFreq, endFreq, dur, gain: pulseGain }) => {
        const pulseTime = startTime + time;
        if (pulseTime >= startTime + durationSec) return;

        // 1. Ana Pürüzsüz Sinüs Osilatör (Fütüristik tarama tınısı)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, pulseTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, pulseTime + dur);

        gain.gain.setValueAtTime(0.001, pulseTime);
        gain.gain.linearRampToValueAtTime(pulseGain, pulseTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + dur);

        // 2. Hafif Tri-Harmonik Alt Tını (Akustik sonar derinliği)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(startFreq * 0.5, pulseTime);
        subOsc.frequency.linearRampToValueAtTime(endFreq * 0.5, pulseTime + dur);

        subGain.gain.setValueAtTime(0.001, pulseTime);
        subGain.gain.linearRampToValueAtTime(pulseGain * 0.35, pulseTime + 0.03);
        subGain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        osc.start(pulseTime);
        osc.stop(pulseTime + dur);
        subOsc.start(pulseTime);
        subOsc.stop(pulseTime + dur);
      });
    } catch (e) { }
  }

  function playWinSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.35, gain: 0.14 },
        { freq: 659.25, time: 0.08, dur: 0.35, gain: 0.14 },
        { freq: 783.99, time: 0.16, dur: 0.38, gain: 0.16 },
        { freq: 1046.50, time: 0.24, dur: 0.65, gain: 0.20 },
        { freq: 1318.51, time: 0.30, dur: 0.70, gain: 0.12 }
      ];
      notes.forEach(({ freq, time, dur, gain: noteGain }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(noteGain, ctx.currentTime + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } catch (e) { }
  }

  updateSoundUI();
  if (soundToggleBtn) soundToggleBtn.addEventListener('click', toggleSound);

  // --- Ana Navigasyon Modu (Kütüphanemden Seç vs Steam Mağazasında Keşfet) ---
  let currentMainView = 'library'; // 'library' | 'explorer'

  function switchMainView(newView) {
    if (currentMainView === newView) return;
    currentMainView = newView;

    if (newView === 'library') {
      if (navLibraryModeBtn) navLibraryModeBtn.classList.add('active');
      if (navExplorerModeBtn) navExplorerModeBtn.classList.remove('active');

      if (searchSection) searchSection.classList.remove('hidden');
      if (explorerSection) explorerSection.classList.add('hidden');
      if (explorerLoadingSection) explorerLoadingSection.classList.add('hidden');
      if (explorerResultSection) explorerResultSection.classList.add('hidden');
    } else {
      if (navExplorerModeBtn) navExplorerModeBtn.classList.add('active');
      if (navLibraryModeBtn) navLibraryModeBtn.classList.remove('active');

      if (searchSection) searchSection.classList.add('hidden');
      if (profileDashboard) profileDashboard.classList.add('hidden');
      if (rouletteSection) rouletteSection.classList.add('hidden');
      if (resultSection) resultSection.classList.add('hidden');

      if (explorerSection) {
        explorerSection.classList.remove('hidden');
        explorerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateSliderVisuals();
      }
    }

    hideError();
    playBlipSound();
  }

  if (navLibraryModeBtn) {
    navLibraryModeBtn.addEventListener('click', () => switchMainView('library'));
  }
  if (navExplorerModeBtn) {
    navExplorerModeBtn.addEventListener('click', () => switchMainView('explorer'));
  }

  // --- Mod / Sekme Değiştirme (Tek Kişilik vs Ortak Oyun) ---
  function switchMode(newMode) {
    if (currentMode === newMode) return;
    currentMode = newMode;

    if (newMode === 'single') {
      singleModeTab.classList.add('active');
      singleModeTab.setAttribute('aria-selected', 'true');
      coopModeTab.classList.remove('active');
      coopModeTab.setAttribute('aria-selected', 'false');
      singleFormContent.classList.remove('hidden');
      coopFormContent.classList.add('hidden');
      // SEC-02: innerHTML yerine DOM API
      if (cardHeaderTitle) {
        safeReplaceChildren(cardHeaderTitle, makeIcon('fa-solid fa-gamepad'), ' Steam Hesabını Bağla');
      }
      if (cardHeaderBadge) {
        cardHeaderBadge.textContent = 'KOLAY VE HIZLI';
        cardHeaderBadge.className = 'badge badge-header-tag';
      }
    } else {
      coopModeTab.classList.add('active');
      coopModeTab.setAttribute('aria-selected', 'true');
      singleModeTab.classList.remove('active');
      singleModeTab.setAttribute('aria-selected', 'false');
      coopFormContent.classList.remove('hidden');
      singleFormContent.classList.add('hidden');
      if (cardHeaderTitle) {
        safeReplaceChildren(cardHeaderTitle, makeIcon('fa-solid fa-user-group'), ' Ortak Kütüphane Seçimi');
      }
      if (cardHeaderBadge) {
        cardHeaderBadge.textContent = 'BİRLİKTE OYNA';
        cardHeaderBadge.className = 'badge badge-header-tag';
      }
      if (!coopInput1.value && steamInput.value) {
        coopInput1.value = steamInput.value;
      }
    }
    hideError();
    playBlipSound();
  }

  singleModeTab.addEventListener('click', () => switchMode('single'));
  coopModeTab.addEventListener('click', () => switchMode('coop'));

  // --- Yardımcı Görsel İşlevler ---
  function showLoading(message = 'Steam Kütüphaneniz Yükleniyor...', sub = 'Oyunlar ve profil detayları getiriliyor, lütfen bekleyin.') {
    if (loadingText) loadingText.textContent = message;
    if (loadingSub) loadingSub.textContent = sub;
    loadingSection.classList.remove('hidden');
    hideError();
  }

  function hideLoading() {
    loadingSection.classList.add('hidden');
  }

  function showError(title, message, isPrivacyIssue = false) {
    errorTitle.textContent = title || 'Hata';
    errorMessage.textContent = message || 'Beklenmeyen bir hata oluştu.';
    if (isPrivacyIssue) {
      privacyHelp.classList.remove('hidden');
    } else {
      privacyHelp.classList.add('hidden');
    }
    errorBox.classList.remove('hidden');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBox.classList.add('hidden');
    privacyHelp.classList.add('hidden');
  }

  closeErrorBtn.addEventListener('click', hideError);

  // --- API İsteği 1: Tek Kişilik Kütüphaneyi Getir ---
  async function loadSteamLibrary(steamIdentifier) {
    if (!steamIdentifier || !steamIdentifier.trim()) {
      showError('Girdi Gerekli', 'Lütfen geçerli bir SteamID64, profil linki veya özel profil adı girin.');
      return;
    }
    const trimmedInput = steamIdentifier.trim();
    showLoading('Steam Kütüphanesi ve Profil Detayları Çekiliyor...');
    hideError();
    resultSection.classList.add('hidden');
    rouletteSection.classList.add('hidden');

    try {
      const apiUrl = `${API_BASE}/api/games?input=${encodeURIComponent(trimmedInput)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      hideLoading();

      if (!response.ok || !data.success) {
        const isPrivacy = response.status === 404 || (data.message && data.message.includes('gizli'));
        showError(
          response.status === 404 ? 'Kütüphane Bulunamadı veya Gizli' : 'İstek Başarısız Oldu',
          data.message || 'Oyunlar getirilirken bir sorun oluştu.',
          isPrivacy
        );
        return;
      }

      allGames = data.games || [];
      singlePlayer = data.player;
      coopPlayer1 = null;
      coopPlayer2 = null;

      if (allGames.length === 0) {
        showError('Kütüphane Boş', 'Bu hesapta oynanabilir oyun bulunamadı.', true);
        return;
      }

      try { localStorage.setItem('last_steam_id', trimmedInput); } catch (e) { }

      singleProfileBar.classList.remove('hidden');
      coopProfileBar.classList.add('hidden');
      renderSingleUserProfile(data.player, data.steamId, allGames);
      updateFilterLabelsAndCounts();
      applyFilter(activeFilter);

      profileDashboard.classList.remove('hidden');
      profileDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(updateFilterSlider);
      setTimeout(updateFilterSlider, 60);

    } catch (err) {
      hideLoading();
      console.error('Kütüphane yüklenirken hata:', err);
      const hint = isFileProtocol
        ? 'Sayfayı doğrudan dosya olarak (file://) açtınız. Lütfen tarayıcınızın adres çubuğuna http://localhost:3000 yazarak giriş yapın ve sunucunun çalıştığından emin olun.'
        : 'Sunucuya ulaşılamadı. Lütfen sunucunun çalıştığından ve internet bağlantınızdan emin olun.';
      showError('Bağlantı Hatası', hint);
    }
  }

  // --- API İsteği 2: Ortak Oyunlar (Co-Op Matchmaker) ---
  async function loadCommonGames(player1Input, player2Input) {
    if (!player1Input || !player1Input.trim()) {
      showError('1. Oyuncu Eksik', 'Lütfen 1. oyuncu için SteamID, profil linki veya kullanıcı adı giriniz.');
      if (coopInput1) coopInput1.focus();
      return;
    }
    if (!player2Input || !player2Input.trim()) {
      showError('2. Oyuncu Eksik', 'Lütfen 2. oyuncu için SteamID, profil linki veya kullanıcı adı giriniz.');
      if (coopInput2) coopInput2.focus();
      return;
    }

    const p1 = player1Input.trim();
    const p2 = player2Input.trim();

    showLoading(
      'Ortak Kütüphane Taranıyor...',
      'Her iki oyuncunun kütüphanesi çekiliyor, AppID eşleştirmesi yapılıyor ve çok oyunculu oyunlar analiz ediliyor...'
    );
    hideError();
    resultSection.classList.add('hidden');
    rouletteSection.classList.add('hidden');

    try {
      const apiUrl = `${API_BASE}/api/common-games?player1=${encodeURIComponent(p1)}&player2=${encodeURIComponent(p2)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      hideLoading();

      if (!response.ok || !data.success) {
        const isPrivacy = response.status === 404 && (data.isPrivacy || (data.message && data.message.includes('gizli')));
        showError(
          response.status === 404 ? 'Ortak Oyun Bulunamadı' : 'İstek Başarısız Oldu',
          data.message || 'Seçilen oyuncunun kütüphanesi gizli veya ortak çok oyunculu oyun bulunamadı!',
          isPrivacy
        );
        return;
      }

      allGames = data.games || [];
      coopPlayer1 = data.player1;
      coopPlayer2 = data.player2;
      singlePlayer = null;

      if (allGames.length === 0) {
        showError('Çok Oyunculu Oyun Bulunamadı', 'Seçilen iki oyuncunun kütüphanesinde birlikte oynanabilecek ortak çok oyunculu oyun bulunamadı.');
        return;
      }

      try {
        localStorage.setItem('last_steam_coop_1', p1);
        localStorage.setItem('last_steam_coop_2', p2);
      } catch (e) { }

      singleProfileBar.classList.add('hidden');
      coopProfileBar.classList.remove('hidden');
      renderCoopProfiles(data.player1, data.player2, data.steamId1, data.steamId2, allGames.length);
      updateFilterLabelsAndCounts();
      applyFilter(activeFilter);

      profileDashboard.classList.remove('hidden');
      profileDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(updateFilterSlider);
      setTimeout(updateFilterSlider, 60);

    } catch (err) {
      hideLoading();
      console.error('Ortak oyunlar taranırken hata:', err);
      const hint = isFileProtocol
        ? 'Sayfayı doğrudan dosya olarak (file://) açtınız. Lütfen tarayıcınızın adres çubuğuna http://localhost:3000 yazarak giriş yapın.'
        : 'Sunucuya ulaşılamadı. Lütfen sunucunun çalıştığından ve internet bağlantınızdan emin olun.';
      showError('Bağlantı Hatası', hint);
    }
  }

  // --- Tek Kişilik Profil Arayüzünü Doldurma (SEC-02: innerHTML yok) ---
  function renderSingleUserProfile(player, steamId, games) {
    const DEFAULT_AVATAR = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
    if (player) {
      userName.textContent = player.personaname || 'Steam Kullanıcısı';
      userAvatar.src = player.avatar || DEFAULT_AVATAR;
      userProfileLink.href = player.profileurl || `https://steamcommunity.com/profiles/${steamId}`;
    } else {
      userName.textContent = `Steam Kullanıcısı (${steamId})`;
      userAvatar.src = DEFAULT_AVATAR;
      userProfileLink.href = `https://steamcommunity.com/profiles/${steamId}`;
    }

    // SEC-02: statGameCount/statTotalHours → güvenli DOM oluşturma
    const totalMinutes = games.reduce((acc, g) => acc + (g.playtime_forever || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(0);
    safeReplaceChildren(statGameCount, makeIcon('fa-solid fa-layer-group'), ` `, el('strong', games.length.toString()), ` Oyun`);
    safeReplaceChildren(statTotalHours, makeIcon('fa-regular fa-clock'), ` `, el('strong', totalHours), ` Saat Toplam`);
  }

  // --- Co-Op (İki Oyuncu) Profil Arayüzünü Doldurma (SEC-02: innerHTML yok) ---
  function renderCoopProfiles(p1, p2, steamId1, steamId2, commonCount) {
    const DEFAULT_AVATAR = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
    if (p1) {
      coopName1.textContent = p1.personaname || '1. Oyuncu';
      coopAvatar1.src = p1.avatar || DEFAULT_AVATAR;
      coopProfileLink1.href = p1.profileurl || `https://steamcommunity.com/profiles/${steamId1}`;
    } else {
      coopName1.textContent = `Oyuncu 1 (${steamId1})`;
      coopAvatar1.src = DEFAULT_AVATAR;
      coopProfileLink1.href = `https://steamcommunity.com/profiles/${steamId1}`;
    }
    if (p2) {
      coopName2.textContent = p2.personaname || '2. Oyuncu';
      coopAvatar2.src = p2.avatar || DEFAULT_AVATAR;
      coopProfileLink2.href = p2.profileurl || `https://steamcommunity.com/profiles/${steamId2}`;
    } else {
      coopName2.textContent = `Oyuncu 2 (${steamId2})`;
      coopAvatar2.src = DEFAULT_AVATAR;
      coopProfileLink2.href = `https://steamcommunity.com/profiles/${steamId2}`;
    }
    if (coopCommonCount) coopCommonCount.textContent = commonCount;
  }

  // --- Filtre Etiketleri ve Sayaçları ---
  function updateFilterLabelsAndCounts() {
    const isCoop = currentMode === 'coop';
    if (filterAllLabel) filterAllLabel.textContent = isCoop ? 'Tüm Çok Oyunculu Oyunlar' : 'Tüm Oyunlar';
    if (filterUnplayedLabel) filterUnplayedLabel.textContent = isCoop ? 'İkimizin de Oynamadıkları' : 'Hiç Oynamadıklarım';
    if (filterLowLabel) filterLowLabel.textContent = isCoop ? 'Az Oynadıklarımız (< 5 Saat)' : 'Az Oynadıklarım (< 5 Saat)';
    if (filterPlayedLabel) filterPlayedLabel.textContent = isCoop ? 'Çok Oynadıklarımız (> 10 Saat)' : 'Çok Oynadıklarım (> 10 Saat)';

    let unplayed = [], low = [], played = [];
    if (isCoop) {
      unplayed = allGames.filter(g => (g.player1_playtime_forever || 0) === 0 && (g.player2_playtime_forever || 0) === 0);
      low = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h > 0 && h < 5; });
      played = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h >= 10; });
    } else {
      unplayed = allGames.filter(g => (g.playtime_forever || 0) === 0);
      low = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h > 0 && h < 5; });
      played = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h >= 10; });
    }

    if (filterAllCount) filterAllCount.textContent = allGames.length;
    if (filterUnplayedCount) filterUnplayedCount.textContent = unplayed.length;
    if (filterLowCount) filterLowCount.textContent = low.length;
    if (filterPlayedCount) filterPlayedCount.textContent = played.length;

    requestAnimationFrame(updateFilterSlider);
  }

  // --- Filtre Uygulama ---
  function applyFilter(filterType) {
    activeFilter = filterType;
    const isCoop = currentMode === 'coop';

    filterButtons.forEach(btn => {
      if (btn.dataset.filter === filterType) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        if (typeof btn.scrollIntoView === 'function') {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    updateFilterSlider();

    switch (filterType) {
      case 'unplayed':
        currentFilteredGames = isCoop
          ? allGames.filter(g => (g.player1_playtime_forever || 0) === 0 && (g.player2_playtime_forever || 0) === 0)
          : allGames.filter(g => (g.playtime_forever || 0) === 0);
        break;
      case 'low':
        currentFilteredGames = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h > 0 && h < 5; });
        break;
      case 'played':
        currentFilteredGames = allGames.filter(g => { const h = (g.playtime_forever || 0) / 60; return h >= 10; });
        break;
      default:
        currentFilteredGames = [...allGames];
    }

    if (currentFilteredGames.length === 0) {
      currentFilteredGames = [...allGames];
      showError('Filtre Sonucu Boş', 'Seçilen kritere uygun oyun bulunamadığından tüm kütüphane havuzu kullanılacak.');
    }
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  // --- Rulet ve Rastgele Seçim Algoritması ---
  function spinRoulette() {
    if (isRolling) return;
    if (!currentFilteredGames || currentFilteredGames.length === 0) {
      showError('Oyun Havuzu Boş', 'Lütfen önce oyun kütüphanenizi yükleyin.');
      return;
    }

    isRolling = true;
    pickGameBtn.disabled = true;
    rePickBtn.disabled = true;
    hideError();

    const winningIndex = Math.floor(Math.random() * currentFilteredGames.length);
    const chosenGame = currentFilteredGames[winningIndex];
    const targetSlotIndex = 22;
    const rouletteItems = [];

    for (let i = 0; i < 28; i++) {
      rouletteItems.push(i === targetSlotIndex ? chosenGame : currentFilteredGames[Math.floor(Math.random() * currentFilteredGames.length)]);
    }

    // SEC-02: rouletteTrack.innerHTML = '' yerine replaceChildren
    rouletteTrack.replaceChildren();
    const fragment = document.createDocumentFragment();

    rouletteItems.forEach((game, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'roulette-item';
      itemEl.id = `rouletteItem_${idx}`;

      const img = document.createElement('img');
      img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
      img.alt = game.name;
      img.decoding = 'async';
      img.loading = idx < 6 ? 'eager' : 'lazy';
      img.onerror = () => { img.src = 'https://steamcdn-a.akamaihd.net/steam/apps/0/header.jpg'; };

      const title = document.createElement('div');
      title.className = 'roulette-item-title';
      title.textContent = game.name;

      itemEl.appendChild(img);
      itemEl.appendChild(title);
      fragment.appendChild(itemEl);
    });

    rouletteTrack.appendChild(fragment);

    resultSection.classList.add('hidden');
    rouletteSection.classList.remove('hidden');
    const rouletteWindow = rouletteSection.querySelector('.roulette-window');

    rouletteTrack.style.transition = 'none';
    rouletteTrack.style.transform = 'translate3d(0px, 0, 0)';

    const viewportWidth = window.innerWidth;
    const itemWidth = viewportWidth <= 480 ? 160 : viewportWidth <= 768 ? 192 : 280;
    const windowWidth = rouletteWindow ? rouletteWindow.clientWidth : 800;
    const jitter = (Math.random() - 0.5) * 20;
    const finalOffset = (targetSlotIndex * itemWidth) + (itemWidth / 2) - (windowWidth / 2) + jitter;

    rouletteSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scheduleRouletteSounds(2.8);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (rouletteWindow) rouletteWindow.classList.add('is-spinning');
        rouletteTrack.style.transition = 'transform 2.8s cubic-bezier(0.12, 0.8, 0.33, 1)';
        rouletteTrack.style.transform = `translate3d(-${finalOffset}px, 0, 0)`;
      });
    });

    setTimeout(() => {
      isRolling = false;
      pickGameBtn.disabled = false;
      rePickBtn.disabled = false;
      if (rouletteWindow) rouletteWindow.classList.remove('is-spinning');
      playWinSound();

      const winningElement = document.getElementById(`rouletteItem_${targetSlotIndex}`);
      if (winningElement) {
        winningElement.style.borderColor = 'var(--steam-green)';
        winningElement.style.boxShadow = '0 0 30px rgba(164, 208, 7, 0.9)';
        winningElement.style.transform = 'scale(1.08)';
      }

      displayGameResult(chosenGame);
      triggerVictoryConfetti();
      setTimeout(() => { resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
    }, 2900);
  }

  // --- Seçilen Oyun Sonuç Kartını Doldurma (SEC-02: innerHTML kaldırıldı) ---
  function displayGameResult(game) {
    const isCoop = currentMode === 'coop';
    const headerImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

    resultGameImage.src = headerImageUrl;
    resultGameImage.alt = game.name;
    resultGameTitle.textContent = game.name;
    resultAppId.textContent = game.appid;

    const resultPosterBackdrop = document.getElementById('resultPosterBackdrop');
    if (resultPosterBackdrop) {
      resultPosterBackdrop.style.backgroundImage = `url('${headerImageUrl}')`;
    }

    const gameResultCard = document.getElementById('gameResultCard');
    if (gameResultCard) {
      gameResultCard.classList.remove('winner-celebration');
      void gameResultCard.offsetWidth;
      gameResultCard.classList.add('winner-celebration');
    }

    if (isCoop) {
      if (resultCelebrationText) resultCelebrationText.textContent = 'İKİNİZ İÇİN HARİKA BİR ORTAK OYUN!';
      if (resultCoopBadge) resultCoopBadge.classList.remove('hidden');
      if (resultRecentTimeBox) resultRecentTimeBox.classList.add('hidden');

      // SEC-02: innerHTML yerine DOM API
      if (resultTotalTimeLabel) {
        safeReplaceChildren(resultTotalTimeLabel, makeIcon('fa-regular fa-clock'), ' Ortak Toplam:');
      }

      const p1Hours = game.player1_playtime_hours !== undefined
        ? game.player1_playtime_hours
        : ((game.player1_playtime_forever || 0) / 60).toFixed(1);
      const p2Hours = game.player2_playtime_hours !== undefined
        ? game.player2_playtime_hours
        : ((game.player2_playtime_forever || 0) / 60).toFixed(1);

      if (resultCoopPlayer1Box) {
        resultCoopPlayer1Box.classList.remove('hidden');
        if (resultPlayer1Label) {
          safeReplaceChildren(resultPlayer1Label, makeIcon('fa-solid fa-user'), ` ${coopPlayer1?.personaname || '1. Oyuncu'}:`);
        }
        if (resultPlayer1Time) resultPlayer1Time.textContent = `${p1Hours} Saat`;
      }

      if (resultCoopPlayer2Box) {
        resultCoopPlayer2Box.classList.remove('hidden');
        if (resultPlayer2Label) {
          safeReplaceChildren(resultPlayer2Label, makeIcon('fa-solid fa-user-group'), ` ${coopPlayer2?.personaname || '2. Oyuncu'}:`);
        }
        if (resultPlayer2Time) resultPlayer2Time.textContent = `${p2Hours} Saat`;
      }

      const totalHours = ((game.playtime_forever || 0) / 60).toFixed(1);
      resultTotalTime.textContent = `${totalHours} Saat`;
      const playtimeSpan = resultPlaytimeTag ? resultPlaytimeTag.querySelector('span') : null;
      if (playtimeSpan) playtimeSpan.textContent = `${totalHours} Saat Ortak`;

      // Çok Oyunculu Kategori Rozetleri (SEC-02: innerHTML yok)
      if (resultCategoriesRow) {
        const cats = game.multiplayer_categories || ['Çok Oyunculu'];
        const nodes = cats.slice(0, 4).map(cat => {
          const pill = document.createElement('span');
          pill.className = 'cat-pill';
          safeReplaceChildren(pill, makeIcon('fa-solid fa-gamepad'), ` ${cat}`);
          return pill;
        });
        resultCategoriesRow.replaceChildren(...nodes);
        resultCategoriesRow.classList.remove('hidden');
      }

    } else {
      // Tek Kişilik Mod
      if (resultCategoriesRow) {
        resultCategoriesRow.replaceChildren();
        resultCategoriesRow.classList.add('hidden');
      }
      if (resultCelebrationText) resultCelebrationText.textContent = 'İŞTE BUGÜNKÜ OYUNUN!';
      if (resultCoopBadge) resultCoopBadge.classList.add('hidden');
      if (resultCoopPlayer1Box) resultCoopPlayer1Box.classList.add('hidden');
      if (resultCoopPlayer2Box) resultCoopPlayer2Box.classList.add('hidden');
      if (resultRecentTimeBox) resultRecentTimeBox.classList.remove('hidden');

      if (resultTotalTimeLabel) {
        safeReplaceChildren(resultTotalTimeLabel, makeIcon('fa-regular fa-clock'), ' Toplam Süre:');
      }

      const hours = ((game.playtime_forever || 0) / 60).toFixed(1);
      resultTotalTime.textContent = `${hours} Saat`;
      const playtimeSpan = resultPlaytimeTag ? resultPlaytimeTag.querySelector('span') : null;
      if (playtimeSpan) playtimeSpan.textContent = `${hours} Saat Oynandı`;

      if (resultRecentTime) {
        resultRecentTime.textContent = (game.playtime_2weeks && game.playtime_2weeks > 0)
          ? `${game.playtime_2weeks} Saat`
          : 'Son 2 haftada oynanmadı';
      }
    }

    // Buton Bağlantıları
    resultLaunchBtn.href = `steam://run/${game.appid}`;
    resultStoreBtn.href = `https://store.steampowered.com/app/${game.appid}/`;
    resultStoreBtn.target = '_blank';
    resultStoreBtn.rel = 'noopener noreferrer';
    resultStoreBtn.setAttribute('referrerpolicy', 'no-referrer');
    if (resultSteamStoreBtn) resultSteamStoreBtn.href = `steam://store/${game.appid}`;

    resultSection.classList.remove('hidden');
  }

  // --- Zafer Kutlaması Konfeti Animasyonu ---
  function triggerVictoryConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const colors = ['#66c0f4', '#1bd1bc', '#1999ff', '#a4d007', '#ffd700', '#ffffff', '#e056fd'];
    const particles = [];
    const particleCount = Math.min(100, Math.floor(width / 12));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 160,
        y: height * 0.45 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.85) * 18,
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        alpha: 1,
        gravity: 0.36,
        drag: 0.965
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, width, height);
      let activeCount = 0;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.rot += p.rotSpeed;
        p.alpha -= 0.009;
        if (p.alpha > 0) {
          activeCount++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          ctx.restore();
        }
      });
      if (activeCount > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationFrame);
      }
    }
    render();
  }

  // --- Steam Store Explorer: Sonuç Kartını Doldurma (SEC-02: DOM XSS korumalı) ---
  function displayExplorerResult(game, alternatives, isRelaxed = false) {
    if (!game) return;

    const headerImageUrl = game.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

    explorerGameImage.src = headerImageUrl;
    explorerGameImage.alt = game.name;
    explorerGameTitle.textContent = game.name;
    explorerAppId.textContent = game.appid;

    if (explorerPosterBackdrop) {
      explorerPosterBackdrop.style.backgroundImage = `url('${headerImageUrl}')`;
    }

    // Zafer aurası
    if (explorerResultCard) {
      explorerResultCard.classList.remove('winner-celebration');
      void explorerResultCard.offsetWidth;
      explorerResultCard.classList.add('winner-celebration');
    }

    // Fiyat Rozeti ve Metinleri
    if (game.price_type === 'free') {
      explorerPriceText.textContent = 'ÜCRETSİZ';
      explorerPriceBadge.className = 'price-tag-badge badge-free';
      explorerMetaPrice.textContent = 'Ücretsiz (Free-to-Play)';
    } else if (game.discount_percent && game.discount_percent > 0) {
      explorerPriceText.textContent = `-%${game.discount_percent} İNDİRİM • ${game.final_price_tl} TL`;
      explorerPriceBadge.className = 'price-tag-badge';
      explorerMetaPrice.textContent = `${game.final_price_tl} TL (Orijinal: ${game.price_tl} TL)`;
    } else {
      explorerPriceText.textContent = `${game.final_price_tl || game.price_tl} TL`;
      explorerPriceBadge.className = 'price-tag-badge';
      explorerMetaPrice.textContent = `${game.final_price_tl || game.price_tl} TL`;
    }

    // İnceleme Rozeti
    if (explorerReviewText) {
      explorerReviewText.textContent = game.review_desc || `%${game.review_score} Olumlu`;
    }

    // Oyuncu Modu
    if (explorerMetaPlayerMode) {
      explorerMetaPlayerMode.textContent = game.player_mode === 'single'
        ? 'Tek Oyunculu (Singleplayer)'
        : game.player_mode === 'multi'
          ? 'Çok Oyunculu / Co-op'
          : 'Tek Oyunculu ve Çok Oyunculu';
    }

    // Oyun Açıklaması
    if (explorerGameDesc) {
      explorerGameDesc.textContent = game.short_description || 'Steam mağazasında son dönemin en popüler ve beğenilen oyunlarından biri.';
    }

    // Tür ve Etiket Rozetleri (SEC-02: güvenli DOM)
    if (explorerTagsRow) {
      const tags = (game.tags && game.tags.length > 0) ? game.tags : (game.genres || ['Popüler']);
      const tagNodes = tags.slice(0, 5).map(tag => {
        const span = document.createElement('span');
        span.className = 'cat-pill';
        safeReplaceChildren(span, makeIcon('fa-solid fa-tag'), ` ${tag}`);
        return span;
      });
      explorerTagsRow.replaceChildren(...tagNodes);
    }

    // Buton Bağlantıları
    const storeUrl = game.store_url || `https://store.steampowered.com/app/${game.appid}/`;
    explorerStoreBtn.href = storeUrl;
    explorerStoreBtn.target = '_blank';
    explorerStoreBtn.rel = 'noopener noreferrer';
    explorerStoreBtn.setAttribute('referrerpolicy', 'no-referrer');

    if (explorerSteamStoreBtn) {
      explorerSteamStoreBtn.href = `steam://store/${game.appid}`;
    }

    // Alternatif Oyunlar
    if (explorerAlternativesContainer && explorerAlternativesGrid) {
      if (alternatives && alternatives.length > 0) {
        const altCards = alternatives.map(alt => {
          const card = document.createElement('div');
          card.className = 'alt-game-card';
          card.title = `"${alt.name}" detaylarını göster`;

          const thumbWrap = document.createElement('div');
          thumbWrap.className = 'alt-game-thumb-wrap';

          const img = document.createElement('img');
          img.className = 'alt-game-img';
          img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${alt.appid}/header.jpg`;
          img.alt = alt.name;
          img.loading = 'lazy';
          img.onerror = () => { img.src = 'https://steamcdn-a.akamaihd.net/steam/apps/0/header.jpg'; };

          thumbWrap.appendChild(img);

          const info = document.createElement('div');
          info.className = 'alt-game-info';

          const title = document.createElement('div');
          title.className = 'alt-game-title';
          title.textContent = alt.name;

          const meta = document.createElement('div');
          meta.className = 'alt-game-meta';

          const price = document.createElement('span');
          price.className = 'alt-game-price';
          price.textContent = alt.price_type === 'free'
            ? 'Ücretsiz'
            : (alt.discount_percent > 0 ? `-%${alt.discount_percent} ${alt.final_price_tl} TL` : `${alt.final_price_tl} TL`);

          const score = document.createElement('span');
          score.className = 'alt-game-score';
          safeReplaceChildren(score, makeIcon('fa-solid fa-thumbs-up'), ` %${alt.review_score}`);

          meta.appendChild(price);
          meta.appendChild(score);
          info.appendChild(title);
          info.appendChild(meta);

          card.appendChild(thumbWrap);
          card.appendChild(info);

          // Tıklandığında bu alternatif ana karta geçer
          card.addEventListener('click', () => {
            playBlipSound();
            const newAlts = [game, ...alternatives.filter(a => a.appid !== alt.appid)];
            displayExplorerResult(alt, newAlts);
            explorerResultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });

          return card;
        });

        explorerAlternativesGrid.replaceChildren(...altCards);
        explorerAlternativesContainer.classList.remove('hidden');
      } else {
        explorerAlternativesContainer.classList.add('hidden');
      }
    }
  }

  // --- Steam Store Explorer: Oturum Geçmişi & Duplicate Önleme ---
  const explorerSeenAppIds = new Set();

  function resetExplorerHistory() {
    explorerSeenAppIds.clear();
  }

  function getActiveFilterCriteria() {
    const activeGenres = Array.from(document.querySelectorAll('#genreChipsGroup .genre-chip.active'))
      .map(c => c.dataset.genre)
      .filter(Boolean);

    const minPrice = minPriceInput ? (parseInt(minPriceInput.value, 10) || 0) : 0;
    const maxPrice = maxPriceInput ? (parseInt(maxPriceInput.value, 10) || 1500) : 1500;
    const pricePreset = document.querySelector('#quickPriceChips .quick-price-btn.active')?.dataset.preset || 'all';

    const playerMode = document.querySelector('#playerModeChipsGroup .player-chip.active')?.dataset.player || 'all';
    const minScore = document.querySelector('#minScoreChipsGroup .score-chip.active')?.dataset.score || 'all';

    return { activeGenres, minPrice, maxPrice, pricePreset, playerMode, minScore };
  }

  // Dual Range Slider Görsel ve Konum Senkronizasyonu
  function updateSliderVisuals() {
    if (!minPriceInput || !maxPriceInput) return;

    let minVal = parseInt(minPriceInput.value, 10);
    let maxVal = parseInt(maxPriceInput.value, 10);

    if (isNaN(minVal)) minVal = 0;
    if (isNaN(maxVal)) maxVal = 1500;

    if (minVal > maxVal) {
      minVal = maxVal;
      minPriceInput.value = String(minVal);
    }

    const maxLimit = 1500;
    const leftPercent = Math.min(100, Math.max(0, (minVal / maxLimit) * 100));
    const rightPercent = Math.min(100, Math.max(0, 100 - (maxVal / maxLimit) * 100));

    if (rangeHighlight) {
      rangeHighlight.style.left = `${leftPercent}%`;
      rangeHighlight.style.right = `${rightPercent}%`;
    }

    if (minPriceDisplay) {
      minPriceDisplay.textContent = `${minVal} TL`;
    }
    if (maxPriceDisplay) {
      maxPriceDisplay.textContent = maxVal >= 1500 ? '1500+ TL' : `${maxVal} TL`;
    }
  }

  function syncPresetHighlightFromSlider() {
    if (!quickPriceChips || !minPriceInput || !maxPriceInput) return;
    const minVal = parseInt(minPriceInput.value, 10);
    const maxVal = parseInt(maxPriceInput.value, 10);

    quickPriceChips.querySelectorAll('.quick-price-btn').forEach(btn => {
      const preset = btn.dataset.preset;
      let matches = false;
      if (preset === 'all' && minVal === 0 && maxVal === 1500) matches = true;
      else if (preset === 'free' && minVal === 0 && maxVal === 0) matches = true;
      else if (preset === 'under250' && minVal === 0 && maxVal === 250) matches = true;
      else if (preset === 'under500' && minVal === 0 && maxVal === 500) matches = true;
      btn.classList.toggle('active', matches);
    });
  }

  function handlePriceSliderChange() {
    updateSliderVisuals();
    syncPresetHighlightFromSlider();
    resetExplorerHistory();
  }

  // --- Steam Store Explorer: Oyun Arama ve Sihirbaz Motoru ---
  let isExploring = false;

  async function exploreStoreGames() {
    if (isExploring) return;

    const { activeGenres, minPrice, maxPrice, pricePreset, playerMode, minScore } = getActiveFilterCriteria();

    isExploring = true;
    if (exploreGameBtn) exploreGameBtn.disabled = true;
    if (reExploreBtn) reExploreBtn.disabled = true;

    hideError();
    explorerResultSection.classList.add('hidden');
    explorerLoadingSection.classList.remove('hidden');
    explorerLoadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Fütüristik "Dijital Tarama / Radar Pulse" ses efekti (rulet tık tık sesi yerine)
    scheduleRadarScanSounds(2.4);

    try {
      const genresParam = activeGenres.join(',');
      const excludeParam = Array.from(explorerSeenAppIds).join(',');
      const priceParam = pricePreset === 'discount' ? 'discount' : (pricePreset === 'free' ? 'free' : '');

      const params = new URLSearchParams({
        genres: genresParam,
        minPrice: String(minPrice),
        maxPrice: String(maxPrice),
        price: priceParam,
        playerMode: playerMode,
        minScore: minScore,
        excludeAppIds: excludeParam
      });

      const apiUrl = `${API_BASE}/api/explore-games?${params.toString()}`;

      const fetchPromise = fetch(apiUrl).then(r => r.json());
      // En az 2.2 saniye radar animasyonu sürsün
      const delayPromise = new Promise(resolve => setTimeout(resolve, 2200));

      const [data] = await Promise.all([fetchPromise, delayPromise]);

      isExploring = false;
      if (exploreGameBtn) exploreGameBtn.disabled = false;
      if (reExploreBtn) reExploreBtn.disabled = false;
      explorerLoadingSection.classList.add('hidden');

      if (!data || !data.success || !data.chosenGame) {
        showError('Oyun Bulunamadı', data?.message || 'Seçtiğiniz kriterlere uyan oyun bulunamadı. Lütfen kriterleri genişletmeyi deneyin.');
        return;
      }

      // Duplicate Kontrolü ve Geçmiş Takibi
      if (data.historyReset) {
        // Tüm havuz tüketildiğinde döngü sıfırlanır
        explorerSeenAppIds.clear();
      }
      if (data.chosenGame && data.chosenGame.appid) {
        explorerSeenAppIds.add(data.chosenGame.appid);
      }

      // Zafer Fanfarı ve Konfeti
      playWinSound();
      triggerVictoryConfetti();

      // Sonucu Render Et
      displayExplorerResult(data.chosenGame, data.alternatives, data.isRelaxed);
      explorerResultSection.classList.remove('hidden');

      setTimeout(() => {
        explorerResultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

    } catch (err) {
      isExploring = false;
      if (exploreGameBtn) exploreGameBtn.disabled = false;
      if (reExploreBtn) reExploreBtn.disabled = false;
      explorerLoadingSection.classList.add('hidden');
      console.error('Store Explorer Hatası:', err);
      showError('Bağlantı Hatası', 'Steam mağaza kataloğu taranırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  // --- Keşif Çiplerinin Etkileşimleri ---
  // 1. Tür Seçimi (Çoklu Seçim Toggle)
  if (genreChipsGroup) {
    genreChipsGroup.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        playBlipSound();
        resetExplorerHistory();
      });
    });
  }

  // 2. Fiyat Dual Range Slider Etkileşimi
  if (minPriceInput) {
    minPriceInput.addEventListener('input', () => {
      handlePriceSliderChange();
    });
  }
  if (maxPriceInput) {
    maxPriceInput.addEventListener('input', () => {
      handlePriceSliderChange();
    });
  }

  // 3. Hızlı Fiyat Ön Ayar Butonları (Quick Presets)
  if (quickPriceChips) {
    quickPriceChips.querySelectorAll('.quick-price-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quickPriceChips.querySelectorAll('.quick-price-btn').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        playBlipSound();

        const preset = btn.dataset.preset;
        if (preset === 'all') {
          minPriceInput.value = '0';
          maxPriceInput.value = '1500';
        } else if (preset === 'free') {
          minPriceInput.value = '0';
          maxPriceInput.value = '0';
        } else if (preset === 'under250') {
          minPriceInput.value = '0';
          maxPriceInput.value = '250';
        } else if (preset === 'under500') {
          minPriceInput.value = '0';
          maxPriceInput.value = '500';
        } else if (preset === 'discount') {
          minPriceInput.value = '0';
          maxPriceInput.value = '1500';
        }

        updateSliderVisuals();
        resetExplorerHistory();
      });
    });
  }

  // 4. Oyuncu Modu (Tekil Seçim Radio)
  if (playerModeChipsGroup) {
    playerModeChipsGroup.querySelectorAll('.player-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        playerModeChipsGroup.querySelectorAll('.player-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        playBlipSound();
        resetExplorerHistory();
      });
    });
  }

  // 5. Minimum İnceleme Puanı (Tekil Seçim Radio)
  if (minScoreChipsGroup) {
    minScoreChipsGroup.querySelectorAll('.score-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        minScoreChipsGroup.querySelectorAll('.score-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        playBlipSound();
        resetExplorerHistory();
      });
    });
  }

  // Explorer Aksiyon Butonları
  if (exploreGameBtn) {
    exploreGameBtn.addEventListener('click', exploreStoreGames);
  }
  if (reExploreBtn) {
    reExploreBtn.addEventListener('click', exploreStoreGames);
  }
  if (changeCriteriaBtn) {
    changeCriteriaBtn.addEventListener('click', () => {
      explorerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- Arka Plan Ortam Parçacıkları ---
  function initAmbientParticles() {
    const container = document.getElementById('ambientParticles');
    if (!container) return;
    // SEC-02: container.innerHTML = '' yerine replaceChildren
    container.replaceChildren();
    const fragment = document.createDocumentFragment();
    const count = 18;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = (Math.random() * 2.5 + 2).toFixed(1);
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${(Math.random() * 100).toFixed(1)}%`;
      const duration = Math.random() * 8 + 10;
      p.style.animationDuration = `${duration.toFixed(1)}s`;
      p.style.animationDelay = `-${(Math.random() * duration).toFixed(1)}s`;
      if (Math.random() > 0.5) {
        p.style.background = '#1bd1bc';
        p.style.boxShadow = '0 0 8px rgba(27, 209, 188, 0.9)';
      }
      fragment.appendChild(p);
    }
    container.appendChild(fragment);
  }
  initAmbientParticles();

  // --- Olay Dinleyicileri ---
  fetchGamesBtn.addEventListener('click', () => loadSteamLibrary(steamInput.value));
  steamInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadSteamLibrary(steamInput.value); });

  demoProfileBtn.addEventListener('click', () => {
    const sampleId = '76561198023414915';
    steamInput.value = sampleId;
    loadSteamLibrary(sampleId);
  });

  fetchCommonGamesBtn.addEventListener('click', () => loadCommonGames(coopInput1.value, coopInput2.value));

  coopInput1.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (coopInput2.value) loadCommonGames(coopInput1.value, coopInput2.value);
      else coopInput2.focus();
    }
  });

  coopInput2.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadCommonGames(coopInput1.value, coopInput2.value);
  });

  demoCoopBtn.addEventListener('click', () => {
    const sampleId1 = '76561198023414915';
    const sampleId2 = '76561197960618312';
    coopInput1.value = sampleId1;
    coopInput2.value = sampleId2;
    loadCommonGames(sampleId1, sampleId2);
  });

  pickGameBtn.addEventListener('click', spinRoulette);
  rePickBtn.addEventListener('click', spinRoulette);

  changeAccountBtn.addEventListener('click', () => {
    profileDashboard.classList.add('hidden');
    resultSection.classList.add('hidden');
    rouletteSection.classList.add('hidden');
    steamInput.value = '';
    steamInput.focus();
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  changeCoopAccountBtn.addEventListener('click', () => {
    profileDashboard.classList.add('hidden');
    resultSection.classList.add('hidden');
    rouletteSection.classList.add('hidden');
    coopInput1.focus();
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // --- Sayfa Yüklendiğinde Başlangıç Kontrolleri ---
  const urlParams = new URLSearchParams(window.location.search);
  const steamIdFromUrl = urlParams.get('steamId');
  const errorFromUrl = urlParams.get('error');

  if (errorFromUrl) {
    showError('Giriş Başarısız', 'Steam ile giriş işlemi iptal edildi veya tamamlanamadı.');
  } else if (steamIdFromUrl) {
    steamInput.value = steamIdFromUrl;
    coopInput1.value = steamIdFromUrl;
    loadSteamLibrary(steamIdFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    try {
      const savedId = localStorage.getItem('last_steam_id');
      const savedCoop1 = localStorage.getItem('last_steam_coop_1');
      const savedCoop2 = localStorage.getItem('last_steam_coop_2');
      if (savedId) steamInput.value = savedId;
      if (savedCoop1) coopInput1.value = savedCoop1;
      if (savedCoop2) coopInput2.value = savedCoop2;
    } catch (e) { }
  }

  window.addEventListener('resize', () => {
    updateFilterSlider();
    updateSliderVisuals();
  });
  window.addEventListener('load', () => {
    updateFilterSlider();
    updateSliderVisuals();
  });
  setTimeout(() => {
    updateFilterSlider();
    updateSliderVisuals();
  }, 100);
});
