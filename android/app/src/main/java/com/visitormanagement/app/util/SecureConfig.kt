package com.visitormanagement.app.util

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure configuration manager for sensitive data
 *
 * IMPORTANT: This is a placeholder implementation.
 * In production, you should:
 * 1. Use BuildConfig with different configurations per build variant
 * 2. Store certificate password in Android Keystore
 * 3. Use Firebase Remote Config or similar for API URLs
 * 4. Never commit sensitive values to Git
 */
object SecureConfig {

    private const val PREFS_NAME = "secure_config"
    private const val KEY_CERT_PASSWORD = "cert_password"
    private const val KEY_API_BASE_URL = "api_base_url"

    // Default values (should be overridden in BuildConfig)
    private const val DEFAULT_CERT_PASSWORD = "visitor123" // TODO: Move to secure storage
    private const val DEFAULT_API_URL = "http://192.168.11.105:3000/api/" // TODO: Use BuildConfig

    /**
     * Get certificate password
     *
     * PRODUCTION TODO:
     * - Store in Android Keystore using androidx.security:security-crypto
     * - Load from BuildConfig based on build variant (debug/release)
     * - Use encrypted SharedPreferences
     */
    fun getCertificatePassword(): String {
        // TODO: Implement secure retrieval from Android Keystore
        return DEFAULT_CERT_PASSWORD
    }

    /**
     * Get API base URL
     *
     * PRODUCTION TODO:
     * - Use BuildConfig.API_BASE_URL (different per build variant)
     * - Load from Firebase Remote Config
     * - Allow dynamic configuration via settings screen
     */
    fun getApiBaseUrl(context: Context): String {
        // Try to get from encrypted shared preferences first
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            val sharedPreferences = EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            sharedPreferences.getString(KEY_API_BASE_URL, null) ?: DEFAULT_API_URL
        } catch (e: Exception) {
            // Fallback to default if encryption fails
            DEFAULT_API_URL
        }
    }

    /**
     * Set custom API base URL (e.g., from settings screen)
     */
    fun setApiBaseUrl(context: Context, url: String) {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            val sharedPreferences = EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            sharedPreferences.edit()
                .putString(KEY_API_BASE_URL, url)
                .apply()
        } catch (e: Exception) {
            // Log error but don't crash
            android.util.Log.e("SecureConfig", "Failed to save API URL", e)
        }
    }
}

/**
 * PRODUCTION DEPLOYMENT GUIDE:
 * ============================
 *
 * 1. BUILD VARIANTS (gradle)
 * ---------------------------
 * android {
 *     buildTypes {
 *         debug {
 *             buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.100:3000/api/\"")
 *             buildConfigField("String", "CERT_PASSWORD", "\"debug_password\"")
 *         }
 *         release {
 *             buildConfigField("String", "API_BASE_URL", "\"https://api.production.com/api/\"")
 *             buildConfigField("String", "CERT_PASSWORD", "\"ENCRYPTED_FROM_KEYSTORE\"")
 *         }
 *     }
 * }
 *
 * 2. ANDROID KEYSTORE
 * -------------------
 * val keyStore = KeyStore.getInstance("AndroidKeyStore")
 * keyStore.load(null)
 * // Store certificate password in keystore
 *
 * 3. FIREBASE REMOTE CONFIG
 * --------------------------
 * val remoteConfig = Firebase.remoteConfig
 * remoteConfig.fetchAndActivate()
 * val apiUrl = remoteConfig.getString("api_base_url")
 *
 * 4. ENVIRONMENT VARIABLES
 * ------------------------
 * # local.properties (NOT committed to Git)
 * api.base.url=https://api.production.com/api/
 * cert.password=secure_password_here
 *
 * # build.gradle.kts
 * val localProperties = Properties()
 * localProperties.load(project.rootProject.file("local.properties").inputStream())
 *
 * buildConfigField("String", "API_BASE_URL", "\"${localProperties["api.base.url"]}\"")
 */
