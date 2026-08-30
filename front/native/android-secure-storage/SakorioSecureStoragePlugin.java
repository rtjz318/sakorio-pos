package com.sakorio.pos;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Stores the printer-agent token encrypted with an app-private Android Keystore key. */
@CapacitorPlugin(name = "SakorioSecureStorage")
public class SakorioSecureStoragePlugin extends Plugin {
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "sakorio_pos_secure_storage_v1";
    private static final String PREFERENCES = "sakorio_secure_storage";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    @PluginMethod
    public void get(PluginCall call) {
        String key = requiredKey(call);
        if (key == null) {
            return;
        }
        try {
            String stored = preferences().getString(key, null);
            JSObject result = new JSObject();
            result.put("value", stored == null ? null : decrypt(stored));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Secure storage read failed: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = requiredKey(call);
        if (key == null) {
            return;
        }
        String value = call.getString("value");
        if (value == null) {
            call.reject("value is required");
            return;
        }
        try {
            preferences().edit().putString(key, encrypt(value)).apply();
            call.resolve();
        } catch (Exception error) {
            call.reject("Secure storage write failed: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = requiredKey(call);
        if (key == null) {
            return;
        }
        preferences().edit().remove(key).apply();
        call.resolve();
    }

    private String requiredKey(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("key is required");
            return null;
        }
        return key.trim();
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, 0);
    }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey());
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + "."
            + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
    }

    private String decrypt(String stored) throws Exception {
        String[] parts = stored.split("\\.", 2);
        if (parts.length != 2) {
            throw new IllegalArgumentException("Stored value has an invalid format");
        }
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP))
        );
        byte[] plaintext = cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP));
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        generator.init(
            new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        );
        return generator.generateKey();
    }
}
