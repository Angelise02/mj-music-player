# 🎵 Music Player

Trình phát nhạch giao diện kính (glassmorphism), viết bằng **HTML + CSS + JavaScript thuần** — không framework, không build step.

Chạy được ở **3 nơi** cùng một mã nguồn:

| Nền tảng | Cách chạy |
|---|---|
| 🌐 Web (GitHub Pages) | Mở `index.html` — hoặc bật Pages trong repo |
| 📱 Android | `android/` — build ra file APK 3 MB, `minSdk 21` |
| 💻 Máy tính | Mở thẳng `index.html`, không cần server |

---

## ✨ Tính năng

- Phát / dừng · chuyển bài trước–sau · tua thanh tiến trình
- **Âm lượng + tắt tiếng**
- **3 chế độ lặp**: tắt → lặp một bài → lặp cả danh sách
- Chế độ ngẫu nhiên, không lặp lại bài đã nghe
- Đĩa than xoay, thu nhỏ dần khi cuộn
- Equalizer nhảy ở bài đang phát
- **Nạp nhạc của chính bạn** — chọn nhiều file MP3/M4A/WAV từ máy
- Nhớ cấu hình bằng `localStorage` (bài đang phát, âm lượng, chế độ lặp)
- **Phím tắt**: `Space` · `←` `→` · `↑` `↓` · `M` · `S` · `R`

---

## 🎵 Về nhạc

Repo **không chứa bất kỳ tệp nhạc có bản quyền nào**.

- 3 bài demo (`audio/*.wav`, tổng 2 MB) được **tự sinh bằng script**, không phải nhạc có thật.
- Bấm **“Nạp nhạc từ máy”** để chọn nhạc của bạn.
  Tệp được đọc bằng `URL.createObjectURL()` → **không nhân bản vào máy**, tự xoá khi đóng app.
- Tự tạo ảnh bìa bằng SVG gradient → không cần file ảnh nào.

Muốn nhạc mẫu thật? Dùng nguồn royalty-free:
[Epidemic Sound](https://www.epidemicsound.com/) ·
[Artlist](https://artlist.io/) ·
[Pixabay Music](https://pixabay.com/music/) ·
[Free Music Archive](https://freemusicarchive.org/)

---

## 📁 Cấu trúc

```
.
├── index.html          # giao diện
├── style.css           # giao diện kính, responsive, safe-area cho máy có notch
├── main.js             # toàn bộ logic player
├── audio/              # 3 bài demo tự sinh
├── android/            # project Android (WebView wrapper)
│   └── app/src/main/
│       ├── assets/www/ # ← bản sao của web app, đóng gói vào APK
│       └── java/…/MainActivity.java
└── tools/
    └── make-demo-audio.ps1   # script sinh lại 3 bài demo
```

---

## 📱 Build APK

Cần: **JDK 17**, Android SDK (platform 35 + build-tools 35), Gradle 8.

```powershell
$env:ANDROID_HOME = "<duong-dan Android SDK>"
$env:JAVA_HOME    = "<duong-dan JDK 17>"
.\gradle.bat assembleDebug          # chạy trong thư mục android/
```

APP kết quả: `android/app/build/outputs/apk/debug/app-debug.apk`

**Không xin bất kỳ quyền nào lúc chạy** — nhạc được nạp qua trình chọn tệp nên Android cấp quyền tạm thời cho URI đã chọn.

Tương thích: `minSdk 21` (Android 5.0) · `targetSdk 35` · không khoá hướng màn hình ·
`resizeableActivity` cho máy tính bảng và máy gập · padding `safe-area` cho notch.

---

## 🌐 Bật GitHub Pages

1. Vào **Settings → Pages**
2. **Source** chọn `Deploy from a branch` → branch `main`, folder `/ (root)`
3. Lưu → vài giây sau có URL dạng `https://<user>.github.io/<repo>/`

---

## 🛠 Những lỗi đã sửa so với bản gốc

Bản gốc là một bài tập học; dưới đây là những lỗi đã tìm ra và sửa:

| Lỗi | Hậu quả |
|---|---|
| `loadCurrentSong()` không luôn set `audio.src` khi bài đã phát | **Phát nhạt cũ trong khi UI đã đổi bài** |
| `scrollIntoView({block:'center'})` khi dashboard `sticky` cao ~500 px | **Bài đang phát bị dashboard che khi chuyển bài** |
| Đĩa CD: `width = cdWidth - scrollTop` | **Đĩa biến mất hoàn toàn** sau ~200 px cuộn |
| `isBiggerThan60()` | Định dạng thời gian sai với bài dài hơn 10 phút |
| Gọi `audio.play()` hai lần | Race condition |
| `audio.onpause` gán bên trong `onclick` | Gán lại handler mỗi lần bấm |
| Biến không `var/let/const` | Tràn ra global scope |
| Đường dẫn `/img/…` (tuyệt đối) | Hỏng khi mở bằng `file://` |
| `<link>` chưa đóng, `<script>` lồng bên trong | HTML sai cú pháp |
| `<meta viewport>` khai báo hai lần | Vô nghĩa |
| Chữ hoa/thường lệch (`.JPG` vs `.jpg`) | 404 hàng loạt trên Linux/macOS |
| Google AdSense nhúng sẵn | Script theo dõi của bên thứ ba — đã gỡ |

---

## ⚖️ Giấy phép

Mã nguồn: mở, dùng tự do.
Ảnh bìa và nhạc demo **được tạo bằng script**, không dùng tài sản của bên thứ ba.