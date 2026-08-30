# Android secure printer-token storage

`SakorioSecureStoragePlugin.java` encrypts the printer-agent token with an app-private AES-GCM key held by Android Keystore. Only the encrypted value is stored in the app's private SharedPreferences.

The generated Android project registers the plugin beside `Xp80tPrinterPlugin`. Reinstall a newly built APK after this file or its generated copy changes.

Clearing application data or uninstalling the app removes both the encrypted token and its Keystore key, which is the intended recovery behavior.
