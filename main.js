/**
 * Music Player — bản Android (WebView)
 *
 * Không nhúng sẵn bất kỳ bản nhạc bản quyền nào.
 *  - 3 bài demo được tự sinh (audio/*.wav)
 *  - Nút "Nạp nhạc từ máy" để người dùng chọn MP3 của họ qua trình chọn tệp
 *    (Android cấp quyền tạm thời cho URI đã chọn → app không cần xin quyền lúc chạy)
 *
 * Sửa các lỗi của bản gốc:
 *  1. loadCurrentSong() phải LUÔN set audio.src (bản gốc có thể phát nhạt cũ khi UI đã đổi bài)
 *  2. Bỏ biến rò rỉ global
 *  3. Định dạng thời gian đúng cho cả bài > 60 phút
 *  4. Không gọi play() hai lần
 *  5. Handler audio gán 1 lần khi khởi tạo
 *  6. Đĩa CD co theo tỉ lệ có sàn → không bao giờ biến mất khi chuyển bài
 *  7. scrollToActive tính chiều cao dashboard → bài đang phát không bị dashboard che
 */
(function () {
  "use strict";

  const $ = document.querySelector.bind(document);
  const audio = $("#audio");
  const player = $("#player");
  const cd = $("#cd");
  const cdThumb = $("#cdThumb");
  const headerTitle = $("#nowPlaying");
  const headerArtist = $("#nowArtist");
  const errorMsg = $("#errorMsg");
  const playlistEl = $("#playlist");
  const playBtn = $("#playBtn");
  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");
  const randomBtn = $("#randomBtn");
  const repeatBtn = $("#repeatBtn");
  const repeatBadge = $("#repeatBadge");
  const muteBtn = $("#muteBtn");
  const volIcon = $("#volIcon");
  const progress = $("#progress");
  const volume = $("#volume");
  const timeStart = $("#timeStart");
  const timeEnd = $("#timeEnd");
  const fileInput = $("#fileInput");
  const btnLoad = $("#btnLoad");
  const btnDemo = $("#btnDemo");

  const STORAGE_KEY = "MJ-PLAYER-V1";

  // 27 bài Michael Jackson kèm ảnh album
  const CATALOG = [
    ["Remember The Time", "Michael Jackson", "music/remember_the_time.mp3", "img/remember_the_time.jpg"],
    ["Beat It", "Michael Jackson", "music/beat_it.mp3", "img/beat_it.jpg"],
    ["Billie Jean", "Michael Jackson", "music/billie_jean.mp3", "img/billie_jean.jpg"],
    ["Black Or White", "Michael Jackson", "music/black_or_white.mp3", "img/black_or_white.jpg"],
    ["Don't Stop Til You Get Enough", "Michael Jackson", "music/dont_stop_til_you_get_enough.mp3", "img/dont_stop_til_you_get_enough.jpg"],
    ["Human Nature", "Michael Jackson", "music/human_nature.mp3", "img/human_nature.jpg"],
    ["Man In The Mirror", "Michael Jackson", "music/man_in_the_mirror.mp3", "img/man_in_the_mirror.jpg"],
    ["Rock With You", "Michael Jackson", "music/rock_with_you.mp3", "img/rock_with_you.jpg"],
    ["Smooth Criminal", "Michael Jackson", "music/smooth_criminal.mp3", "img/smooth_criminal.jpg"],
    ["You Rock My World", "Michael Jackson", "music/you_rock_my_world.mp3", "img/you_rock_my_world.jpg"],
    ["Thriller", "Michael Jackson", "music/thriller.mp3", "img/thriller.jpg"],
    ["Butterflies", "Michael Jackson", "music/butterflies.mp3", "img/background2.jpg"],
    ["Unbreakable", "Michael Jackson", "music/unbreakable.mp3", "img/invincible.jpg"],
    ["Heaven Can Wait", "Michael Jackson", "music/heaven_can_wait.mp3", "img/background3.jpg"],
    ["2000 Watts", "Michael Jackson", "music/2000_watts.mp3", "img/invincible.jpg"],
    ["Break of Dawn", "Michael Jackson", "music/break_of_dawn.mp3", "img/background.jpg"],
    ["The Way You Make Me Feel", "Michael Jackson", "music/the_way_you_make_me_feel.mp3", "img/the_way_you_make_me_feel.jpg"],
    ["They Don't Care About Us", "Michael Jackson", "music/they_dont_care_about_us.mp3", "img/they_dont_care_about_us.jpg"],
    ["Stranger In Moscow", "Michael Jackson", "music/stranger_in_moscow.mp3", "img/stranger_in_moscow.jpg"],
    ["Who Is It", "Michael Jackson", "music/who_is_it.mp3", "img/who_is_it.jpg"],
    ["You Are Not Alone", "Michael Jackson", "music/you_are_not_alone.mp3", "img/you_are_not_alone.jpg"],
    ["Liberian Girl", "Michael Jackson", "music/liberian_girl.mp3", "img/liberian_girl.jpg"],
    ["In The Closet", "Michael Jackson", "music/in_the_closet.mp3", "img/in_the_closet.jpg"],
    ["Love Never Felt So Good", "Michael Jackson", "music/love_never_felt_so_good.mp3", "img/love_never_felt_so_good.png"],
    ["Give In To Me", "Michael Jackson", "music/give_in_to_me.mp3", "img/give_in_to_me.jpg"],
    ["Leave Me Alone", "Michael Jackson", "music/leave_me_alone.mp3", "img/leave_me_alone.jpg"],
    ["Blood On The Dance Floor", "Michael Jackson", "music/blood_on_the_dance_floor.mp3", "img/blood_on_the_dance_floor.jpg"],
  ];

  // Bài demo tự sinh — dùng khi người dùng muốn xoá nhạc đi và nạp nhạc của mình
  const DEMO = [
    ["Aurora", "Demo · tự sinh", "audio/aurora.wav", "#2b6cb0"],
    ["Midnight", "Demo · tự sinh", "audio/midnight.wav", "#6b46c1"],
    ["Pulse", "Demo · tự sinh", "audio/pulse.wav", "#0f766e"],
  ];

  let songs = [];
  let currentIndex = 0;
  let isRandom = false;
  let repeatMode = 0; // 0 tắt · 1 lặp một · 2 lặp cả danh sách
  let history = [];
  let seekTimer = null;
  let objectUrls = []; // các blob: cần thu hồi để không rò rỉ bộ nhớ

  /** Ảnh bìa SVG tạo theo màu — không cần file ảnh nào */
  const makeCover = (seed, color) => {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${color}'/>` +
      `<stop offset='1' stop-color='#0b0b12'/>` +
      `</linearGradient></defs>` +
      `<rect width='100' height='100' fill='url(#g)'/>` +
      `<circle cx='${20 + ((seed * 13) % 60)}' cy='${25 + ((seed * 7) % 45)}' r='26' fill='rgba(255,255,255,0.12)'/>` +
      `<text x='50' y='57' font-size='26' text-anchor='middle' fill='rgba(255,255,255,0.85)'` +
      ` font-family='sans-serif' font-weight='600'>${seed % 10}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  const loadCatalog = () => {
    revokeUrls();
    songs = CATALOG.map(([name, artist, path, image]) => ({ name, artist, path, image }));
    currentIndex = 0;
    history = [];
    bindLibrary();
    loadCurrentSong();
    renderPlaylist();
    clearError();
  };

  const loadDemo = () => {
    revokeUrls();
    songs = DEMO.map(([name, artist, path, color], i) => ({
      name,
      artist,
      path,
      image: makeCover(i + 1, color),
    }));
    currentIndex = 0;
    history = [];
    bindLibrary();
    loadCurrentSong();
    renderPlaylist();
    scrollToActive();
    clearError();
  };

  const revokeUrls = () => {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls = [];
  };

  // ---------------- Nạp nhạc từ máy ----------------
  const loadFromDevice = (files) => {
    const list = Array.from(files).filter((f) => {
      const t = (f.type || "").toLowerCase();
      return t.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(f.name);
    });

    if (!list.length) {
      showError("Không tìm thấy tệp âm thanh nào trong phần bạn chọn.");
      return;
    }

    revokeUrls();
    songs = list.map((f, i) => {
      const url = URL.createObjectURL(f);
      objectUrls.push(url);
      const name = f.name.replace(/\.[^.]+$/, "");
      const palette = ["#2b6cb0", "#6b46c1", "#0f766e", "#9d174d", "#b45309", "#1d4ed8"];
      const color = palette[i % palette.length];
      return { name, artist: "Từ máy của bạn", path: url, color, image: makeCover(i + 1, color) };
    });

    currentIndex = 0;
    history = [];
    bindLibrary();
    loadCurrentSong();
    renderPlaylist();
    scrollToActive();
    clearError();
  };

  /** Nối audio của nguồn hiện tại vào playlist đang hiển thị */
  const bindLibrary = () => {
    audio.src = songs[currentIndex].path;
    audio.load();
  };

  // ---------------- Trạng thái ----------------
  const loadConfig = () => {
    try {
      const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      isRandom = !!cfg.isRandom;
      repeatMode = Number(cfg.repeatMode) || 0;
      if (typeof cfg.volume === "number") {
        volume.value = String(cfg.volume);
        audio.volume = cfg.volume;
      }
      if (cfg.muted) audio.muted = true;
    } catch (e) {
      /* bỏ qua */
    }
  };

  const saveConfig = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ isRandom, repeatMode, volume: Number(volume.value), muted: audio.muted })
      );
    } catch (e) {
      /* bỏ qua */
    }
  };

  // ---------------- Tiện ích ----------------
  const formatTime = (sec) => {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const t = Math.floor(sec);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  };

  const showError = (m) => {
    errorMsg.textContent = m;
    errorMsg.hidden = false;
  };
  const clearError = () => {
    errorMsg.hidden = true;
    errorMsg.textContent = "";
  };

  // ---------------- Hiển thị ----------------
  const renderPlaylist = () => {
    playlistEl.innerHTML = songs
      .map(
        (s, i) => `
      <div class="song${i === currentIndex ? " active" : ""}" data-index="${i}">
        <div class="thumb" style="background-image:url('${s.image}')"></div>
        <div class="body">
          <h3 class="title">${s.name}</h3>
          <p class="author">${s.artist}</p>
        </div>
        <div class="eq" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      </div>`
      )
      .join("");
  };

  const renderNowPlaying = () => {
    const s = songs[currentIndex];
    headerTitle.textContent = s.name;
    headerArtist.textContent = s.artist;
    cdThumb.style.backgroundImage = `url('${s.image}')`;
  };

  const renderToggles = () => {
    randomBtn.classList.toggle("active", isRandom);
    randomBtn.querySelector("i").classList.toggle("active", isRandom);
    repeatBtn.classList.toggle("active", repeatMode > 0);
    repeatBtn.querySelector("i").classList.toggle("active", repeatMode > 0);
    repeatBadge.hidden = repeatMode !== 1;
  };

  const updateVolIcon = () => {
    const v = audio.muted ? 0 : audio.volume;
    volIcon.className = v === 0 ? "fas fa-volume-xmark" : v < 0.5 ? "fas fa-volume-low" : "fas fa-volume-up";
  };

  // ---------------- Nghiệp vụ ----------------
  const loadCurrentSong = () => {
    const s = songs[currentIndex];
    clearError();
    renderNowPlaying();
    audio.src = s.path;
    audio.load();
    progress.value = "0";
    timeStart.textContent = "0:00";
    timeEnd.textContent = "0:00";
    if (!history.includes(currentIndex)) history.push(currentIndex);
    if (history.length === songs.length) history = [];
    saveConfig();
  };

  const play = () => {
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        if (err && err.name === "NotAllowedError") {
          showError("Bấm nút ▶ để bắt đầu phát.");
        } else if (err) {
          showError("Không phát được tệp này — thử định dạng khác (MP3/M4A).");
        }
      });
    }
  };

  const togglePlay = () => (audio.paused ? play() : audio.pause());

  const nextSong = () => {
    if (isRandom) return randomSong();
    currentIndex = (currentIndex + 1) % songs.length;
    loadCurrentSong();
    renderPlaylist();
    scrollToActive();
    play();
  };

  const prevSong = () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    loadCurrentSong();
    renderPlaylist();
    scrollToActive();
    play();
  };

  const randomSong = () => {
    let next;
    do {
      next = Math.floor(Math.random() * songs.length);
    } while (history.includes(next) && history.length < songs.length);
    currentIndex = next;
    loadCurrentSong();
    renderPlaylist();
    scrollToActive();
    play();
  };

  const scrollToActive = () => {
    const el = playlistEl.querySelector(".song.active");
    if (!el) return;
    // Dashboard position:sticky cao gần nửa màn hình, canh "center" sẽ bị dashboard che.
    // Khó hơn: đĩa CD CO DẦN theo scrollY → chiều cao dashboard thay đổi TRONG LÚC đang
    // cuộn mượt. Đo 1 lần rồi tính sẽ lệch, bài đang phát lọt vào vùng bị che.
    // Cách sửa: cuộn tức thì rồi canh lại vài lần cho tới khi vị trí ổn định.
    const place = () => {
      const dashH = document.querySelector(".dashboard").getBoundingClientRect().height;
      const top = window.scrollY + el.getBoundingClientRect().top - dashH - 14;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    };
    place();
    requestAnimationFrame(() => requestAnimationFrame(place));
    setTimeout(place, 60);
    setTimeout(place, 220);
  };

  // ---------------- Sự kiện ----------------
  const bindEvents = () => {
    audio.addEventListener("play", () => player.classList.add("playing"));
    audio.addEventListener("pause", () => player.classList.remove("playing"));

    audio.addEventListener("loadedmetadata", () => {
      timeEnd.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      if (!isFinite(audio.duration) || audio.duration === 0) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
      timeStart.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      if (repeatMode === 1) {
        audio.currentTime = 0;
        play();
      } else if (repeatMode === 2) {
        nextSong();
      } else if (isRandom) {
        randomSong();
      } else if (currentIndex === songs.length - 1) {
        progress.value = "0";
        timeStart.textContent = "0:00";
        player.classList.remove("playing");
      } else {
        nextSong();
      }
    });

    audio.addEventListener("error", () => {
      showError(`Không phát được "${songs[currentIndex].name}". Định dạng có thể không được hỗ trợ.`);
    });

    progress.addEventListener("input", () => {
      if (!isFinite(audio.duration)) return;
      clearTimeout(seekTimer);
      const wasPlaying = !audio.paused;
      const to = (audio.duration / 100) * Number(progress.value);
      if (wasPlaying) audio.pause();
      seekTimer = setTimeout(() => {
        audio.currentTime = to;
        if (wasPlaying) play();
      }, 90);
    });

    playBtn.addEventListener("click", togglePlay);
    prevBtn.addEventListener("click", prevSong);
    nextBtn.addEventListener("click", nextSong);

    randomBtn.addEventListener("click", () => {
      isRandom = !isRandom;
      renderToggles();
      saveConfig();
    });

    repeatBtn.addEventListener("click", () => {
      repeatMode = (repeatMode + 1) % 3;
      renderToggles();
      saveConfig();
    });

    muteBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;
      updateVolIcon();
      saveConfig();
    });

    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value);
      if (audio.volume > 0 && audio.muted) audio.muted = false;
      updateVolIcon();
      saveConfig();
    });

    playlistEl.addEventListener("click", (e) => {
      const row = e.target.closest(".song");
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (idx === currentIndex) {
        audio.currentTime = 0;
        play();
        return;
      }
      currentIndex = idx;
      loadCurrentSong();
      renderPlaylist();
      scrollToActive();
      play();
    });

    // Nạp nhạc
    btnLoad.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length) loadFromDevice(e.target.files);
      fileInput.value = "";
    });
    btnDemo.addEventListener("click", () => {
      loadCatalog();
    });

    // Phím tắt (có bàn phím/nối USB)
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" && e.target.type === "range" && e.key.indexOf("Arrow") === 0) return;
      const k = e.key;
      if (k === " " || k === "Spacebar") { e.preventDefault(); togglePlay(); }
      else if (k === "ArrowRight") { e.preventDefault(); nextSong(); }
      else if (k === "ArrowLeft") { e.preventDefault(); prevSong(); }
      else if (k === "ArrowUp") { e.preventDefault(); volume.value = String(Math.min(1, Number(volume.value) + 0.05)); audio.volume = Number(volume.value); audio.muted = false; updateVolIcon(); saveConfig(); }
      else if (k === "ArrowDown") { e.preventDefault(); volume.value = String(Math.max(0, Number(volume.value) - 0.05)); audio.volume = Number(volume.value); updateVolIcon(); saveConfig(); }
      else if (k === "m" || k === "M") { audio.muted = !audio.muted; updateVolIcon(); saveConfig(); }
      else if (k === "s" || k === "S") randomBtn.click();
      else if (k === "r" || k === "R") repeatBtn.click();
    });

    // Đĩa co khi cuộn — dùng transform:scale() nên CHIỀU CAO dashboard không đổi.
    // Trước đây đổi width khiến dashboard (sticky) đổi chiều cao theo scroll,
    // làm scrollToActive() tính sai và bài đang phát bị che / trượt khỏi màn hình.
    let cdFull = 1;
    const applyCd = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(120, cdFull * 260)));
      const scale = 1 - p * 0.5;
      cd.style.transform = `scale(${scale.toFixed(3)})`;
      cd.style.opacity = String(1 - p * 0.4);
    };
    const measureCd = () => {
      cdFull = cd.offsetWidth || 180;
      applyCd();
    };
    measureCd();
    window.addEventListener("scroll", applyCd, { passive: true });
    window.addEventListener("resize", measureCd);
  };

  const init = () => {
    loadConfig();
    audio.volume = Number(volume.value);
    updateVolIcon();
    loadCatalog();     // mở lên là có đủ 27 bài
    renderToggles();
    bindEvents();
    saveConfig();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();