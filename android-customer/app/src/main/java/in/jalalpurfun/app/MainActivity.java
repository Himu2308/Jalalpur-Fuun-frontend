package in.jalalpurfun.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int GOOGLE_SIGN_IN = 4107;
    private static final String LOGIN_URL = "https://jalalpur-fuun-frontend.onrender.com/login";
    private static final String APP_HOST = "jalalpur-fuun-frontend.onrender.com";
    private static final String API_URL = "https://jalalpur-fuun-backend.onrender.com";
    private static final String WEB_CLIENT_ID = "676087519308-973qhinqr41dq851utmqgjmalotj4t4t.apps.googleusercontent.com";

    private WebView webView;
    private Button signInButton;
    private GoogleSignInClient googleClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(124, 45, 18));
        getWindow().setNavigationBarColor(Color.rgb(67, 20, 7));

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        signInButton = new Button(this);
        signInButton.setText("Continue with Google");
        signInButton.setTextSize(16);
        signInButton.setTextColor(Color.rgb(67, 20, 7));
        signInButton.setAllCaps(false);
        signInButton.setBackgroundColor(Color.WHITE);
        int margin = dp(28);
        FrameLayout.LayoutParams buttonLayout = new FrameLayout.LayoutParams(-1, dp(54));
        buttonLayout.gravity = Gravity.BOTTOM;
        buttonLayout.setMargins(margin, 0, margin, dp(150));
        root.addView(signInButton, buttonLayout);
        setContentView(root);

        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(WEB_CLIENT_ID)
            .build();
        googleClient = GoogleSignIn.getClient(this, options);
        signInButton.setOnClickListener(v -> startActivityForResult(googleClient.getSignInIntent(), GOOGLE_SIGN_IN));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        CookieManager.getInstance().setAcceptCookie(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                boolean login = url.startsWith(LOGIN_URL);
                if (!login) {
                    signInButton.setVisibility(View.GONE);
                    return;
                }
                view.evaluateJavascript(
                    "(()=>{" +
                        "const clean=()=>{" +
                            "document.querySelector('.google-button-wrap')?.setAttribute('style','visibility:hidden;height:58px');" +
                            "document.querySelectorAll('.login-error').forEach(el=>{" +
                                "if(el.textContent.includes('Could not load Google sign-in'))el.style.display='none';" +
                            "});" +
                        "};" +
                        "clean();const observer=new MutationObserver(clean);observer.observe(document.body,{childList:true,subtree:true});" +
                        "setTimeout(()=>observer.disconnect(),10000);" +
                        "return Boolean(localStorage.getItem('userToken'));" +
                    "})()",
                    result -> signInButton.setVisibility("true".equals(result) ? View.GONE : View.VISIBLE));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && APP_HOST.equals(uri.getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });

        if (savedInstanceState == null) webView.loadUrl(LOGIN_URL);
        else webView.restoreState(savedInstanceState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != GOOGLE_SIGN_IN) return;
        try {
            GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException.class);
            exchangeGoogleToken(account.getIdToken());
        } catch (ApiException error) {
            signInButton.setEnabled(true);
            Toast.makeText(this, "Google sign-in failed (code " + error.getStatusCode() + ")", Toast.LENGTH_LONG).show();
        }
    }

    private void exchangeGoogleToken(String idToken) {
        if (idToken == null) return;
        signInButton.setEnabled(false);
        signInButton.setText("Signing you in…");
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(API_URL + "/auth/google").openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(30000);
                connection.setDoOutput(true);
                byte[] body = new JSONObject().put("idToken", idToken).toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) { output.write(body); }
                int status = connection.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                    status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream()));
                StringBuilder responseText = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) responseText.append(line);
                JSONObject response = new JSONObject(responseText.toString());
                if (status < 200 || status >= 300) throw new Exception(response.optString("error", "Sign-in failed"));
                String token = response.getString("token");
                JSONObject user = response.getJSONObject("user");
                runOnUiThread(() -> installSession(token, user));
            } catch (Exception error) {
                runOnUiThread(() -> {
                    signInButton.setEnabled(true);
                    signInButton.setText("Continue with Google");
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void installSession(String token, JSONObject user) {
        signInButton.setVisibility(View.GONE);
        String script = "localStorage.setItem('userToken'," + JSONObject.quote(token) + ");" +
            "localStorage.setItem('user'," + JSONObject.quote(user.toString()) + ");" +
            "location.replace(" + JSONObject.quote(user.optString("phone").isEmpty() ? "/login" : "/") + ");";
        webView.evaluateJavascript(script, null);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
