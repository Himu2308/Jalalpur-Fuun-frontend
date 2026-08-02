# Jalalpur Fun Staff Android app

This Android WebView app opens the production staff scanner at
`https://jalalpur-fuun-frontend.onrender.com/staff/login` and grants camera access only to that host.

Build locally with Java 17, Android SDK 35, and Gradle 8.13:

```sh
gradle assembleDebug
```

The installable APK is generated at `app/build/outputs/apk/debug/app-debug.apk`.
