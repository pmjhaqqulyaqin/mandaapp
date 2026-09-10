package id.sch.mandualotim.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable pinch-to-zoom in WebView
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false); // Hide +/- buttons, keep pinch gesture
        settings.setSupportZoom(true);
    }
}
