package com.trazia.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.FrameLayout;

public final class MainActivity extends Activity {
    private static final int LOCATION_PERMISSION_REQUEST = 4101;
    private static final int AUDIO_PERMISSION_REQUEST = 4102;
    private static final String TRAZIA_URL = "https://valgraffim-bit.github.io/trazia/";

    private WebView webView;
    private GeolocationPermissions.Callback pendingLocationCallback;
    private String pendingLocationOrigin;
    private PermissionRequest pendingAudioRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(16, 38, 59));
        window.setNavigationBarColor(Color.rgb(16, 38, 59));

        // Open TRAZIA in the system browser. Authentication and WebGL mapping
        // work there without the embedded WebView blank-screen failure.
        Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(TRAZIA_URL));
        browser.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(browser);
            finish();
            return;
        } catch (android.content.ActivityNotFoundException ignored) {
            // Fall back to the embedded WebView on devices without a browser.
        }

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(Color.rgb(246, 248, 247));
        webView.setWebViewClient(new TraziaWebViewClient());
        webView.setWebChromeClient(new TraziaWebChromeClient());

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        setContentView(webView);
        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            return;
        }
        webView.loadUrl(TRAZIA_URL + "?native=android-v3");
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            boolean granted = hasLocationPermission();
            if (pendingLocationCallback != null && pendingLocationOrigin != null) {
                pendingLocationCallback.invoke(pendingLocationOrigin, granted, false);
            }
            pendingLocationCallback = null;
            pendingLocationOrigin = null;
        } else if (requestCode == AUDIO_PERMISSION_REQUEST) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingAudioRequest != null) {
                if (granted) {
                    pendingAudioRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                } else {
                    pendingAudioRequest.deny();
                }
            }
            pendingAudioRequest = null;
        }
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isTraziaOrigin(String origin) {
        Uri uri = Uri.parse(origin);
        return "https".equalsIgnoreCase(uri.getScheme())
            && "valgraffim-bit.github.io".equalsIgnoreCase(uri.getHost());
    }

    private final class TraziaWebViewClient extends WebViewClient {
        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            android.util.Log.e("Trazia", "WebView renderer exited after authentication; crashed=" + detail.didCrash());
            if (view != null) {
                ((ViewGroup) view.getParent()).removeView(view);
                view.destroy();
            }
            webView = null;
            recreate();
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            view.evaluateJavascript("window.dispatchEvent(new Event('resize'))", null);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            if ("http".equals(scheme) || "https".equals(scheme)) return false;

            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) {
                // Ignore links that have no compatible app on this device.
            }
            return true;
        }
    }

    private final class TraziaWebChromeClient extends WebChromeClient {
        @Override
        public void onGeolocationPermissionsShowPrompt(
            String origin,
            GeolocationPermissions.Callback callback
        ) {
            if (!isTraziaOrigin(origin)) {
                callback.invoke(origin, false, false);
                return;
            }
            if (hasLocationPermission()) {
                callback.invoke(origin, true, false);
                return;
            }
            pendingLocationOrigin = origin;
            pendingLocationCallback = callback;
            requestPermissions(
                new String[] {
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_FINE_LOCATION
                },
                LOCATION_PERMISSION_REQUEST
            );
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                String[] requested = request.getResources();
                boolean audioOnly = requested.length == 1
                    && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(requested[0]);
                if (!isTraziaOrigin(request.getOrigin().toString()) || !audioOnly) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                    return;
                }
                pendingAudioRequest = request;
                requestPermissions(
                    new String[] { Manifest.permission.RECORD_AUDIO },
                    AUDIO_PERMISSION_REQUEST
                );
            });
        }
    }
}
