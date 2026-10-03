package com.mjplayer;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;

/**
 * Lớp bọc WebView cho trình phát nhạc.
 *
 * Tương thích mọi dòng Android:
 *  - minSdk 21 (Android 5.0) → gần như mọi thiết bị đang chạy
 *  - Không khoá hướng màn hình; xoay máy / gập máy / nhiều cửa sổ đều chạy
 *  - configChanges trong Manifest giữ WebView sống khi xoay → không mất tiến độ phát
 *  - Assets được phục vụ qua https://appassets.androidplatform.net thay vì file://
 *    → origin thật, nên localStorage, blob: và <input type="file"> hoạt động ổn định
 *  - Nền tối + chữ sáng để không chói mắt trên màn OLED
 */
public class MainActivity extends android.app.Activity {

    private static final int REQ_FILE_CHOOSER = 1001;
    private static final String APP_URL =
            "https://appassets.androidplatform.net/assets/www/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private AudioManager audioManager;

    /** Lấy màu tương thích cả API 21 (getColor chỉ có từ API 23). */
    private int bgColor() {
        return getResources().getColor(R.color.bg);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Nền tối ngay từ đầu để không nháy trắng lúc mở app
        Window window = getWindow();
        window.setBackgroundDrawableResource(R.color.bg);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(bgColor());
        root.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        webView.setBackgroundColor(bgColor());
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(webView);
        setContentView(root);

        // Không cho đổi màn hình sáng/tối tự động làm nền web bị lệch màu
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.getSettings().setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: nhớ bài/âm lượng/chế độ
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Phục vụ assets qua https để có origin thật
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                // Chỉ mở trong app; link ngoài thì đưa sang trình duyệt
                if (url != null && "appassets.androidplatform.net".equals(url.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        // BẮT BUỘC: để <input type="file"> mở được trình chọn tệp trong WebView
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("audio/*");
                try {
                    startActivityForResult(
                            Intent.createChooser(intent, "Chọn bài nhạc"),
                            REQ_FILE_CHOOSER);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_FILE_CHOOSER) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (filePathCallback == null) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                results = new Uri[n];
                for (int i = 0; i < n; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    // Nút Back của hệ thống: quay lại trang trước, hết trang thì thoát app
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Nhạc vẫn chạy khi app chạy nền, chỉ dừng khi thật sự thoát
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}