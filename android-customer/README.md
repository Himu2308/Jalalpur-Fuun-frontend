# Jalalpur Fuun customer Android app

The customer app presents the booking website in a full-screen WebView and uses native Android
Google Sign-In. The verified login session is passed into the website so its homepage, checkout,
bookings, and ticket screens continue to work inside the APK.

Google Cloud must contain an Android OAuth client for package `in.jalalpurfun.app` and the SHA-1
of the certificate used to sign the APK. The backend continues to verify tokens against its
existing Web client ID.

Build with Java 17+, Android SDK 35, and Gradle 8.13:

```sh
gradle assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`
