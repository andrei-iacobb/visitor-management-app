# Production Build Configuration Guide

## **⚠️ CRITICAL: Removing Hardcoded Secrets**

This guide explains how to properly configure the Android app for production deployment by removing hardcoded secrets.

---

## **Current Hardcoded Values (MUST FIX)**

### **1. Certificate Password**
**Location**: `RetrofitClient.kt:100, 105`
```kotlin
clientKeyStore.load(clientCertInputStream, "visitor123".toCharArray()) // ❌ HARDCODED
keyManagerFactory.init(clientKeyStore, "visitor123".toCharArray())      // ❌ HARDCODED
```

### **2. API Base URL**
**Location**: `Constants.kt:29`
```kotlin
const val BASE_URL = "http://192.168.11.105:3000/api/"  // ❌ HARDCODED LOCAL IP
```

---

## **Solution: Build Variants + BuildConfig**

### **Step 1: Update `build.gradle.kts`**

Add build configuration fields and build variants:

```kotlin
android {
    ...

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            isDebuggable = true

            // Debug API URL (local development)
            buildConfigField("String", "API_BASE_URL", "\"http://192.168.11.105:3000/api/v1/\"")

            // Debug certificate password (development certs)
            buildConfigField("String", "CERT_PASSWORD", "\"visitor123\"")

            // Enable clear text traffic for local HTTP
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }

        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")

            // Production API URL (HTTPS only)
            buildConfigField("String", "API_BASE_URL", "\"https://api.yourcompany.com/api/v1/\"")

            // Production certificate password (from keystore or environment variable)
            buildConfigField("String", "CERT_PASSWORD", "\"${System.getenv("CERT_PASSWORD") ?: "CHANGE_ME"}\"")

            // Disable clear text traffic in production
            manifestPlaceholders["usesCleartextTraffic"] = "false"
        }
    }

    // Enable BuildConfig generation
    buildFeatures {
        buildConfig = true
    }
}
```

---

### **Step 2: Update `AndroidManifest.xml`**

Make `usesCleartextTraffic` dynamic based on build variant:

```xml
<application
    android:name=".VisitorManagementApp"
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/Theme.VisitorManagement"
    android:usesCleartextTraffic="${usesCleartextTraffic}">  <!-- Dynamic placeholder -->
    ...
</application>
```

---

### **Step 3: Update `Constants.kt`**

Replace hardcoded value with BuildConfig:

```kotlin
object Constants {
    // Use BuildConfig value instead of hardcoded
    const val BASE_URL = BuildConfig.API_BASE_URL  // ✅ From BuildConfig

    const val TIMEOUT_SECONDS = 30L
    const val CONNECT_TIMEOUT_SECONDS = 15L
    const val WRITE_TIMEOUT_SECONDS = 30L
    const val MAX_IMAGE_SIZE_BYTES = 1024 * 1024  // 1MB
    const val IMAGE_QUALITY = 80
    const val IMAGE_MAX_WIDTH = 1024
    const val IMAGE_MAX_HEIGHT = 1024
}
```

---

### **Step 4: Update `RetrofitClient.kt`**

Replace hardcoded password with BuildConfig:

```kotlin
private fun getSslContext(): SSLContext? {
    return try {
        // Load client certificate (PKCS12)
        val clientCertInputStream: InputStream = applicationContext.resources.openRawResource(R.raw.client)
        val clientKeyStore = KeyStore.getInstance("PKCS12")

        // Use BuildConfig password instead of hardcoded
        val certPassword = BuildConfig.CERT_PASSWORD.toCharArray()  // ✅ From BuildConfig
        clientKeyStore.load(clientCertInputStream, certPassword)
        clientCertInputStream.close()

        // Initialize KeyManagerFactory
        val keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        keyManagerFactory.init(clientKeyStore, certPassword)  // ✅ Use same password

        // ... rest of SSL setup
    } catch (e: Exception) {
        Log.e(TAG, "Failed to configure mTLS: ${e.message}", e)
        null
    }
}
```

---

## **Option 2: Environment Variables (Recommended for CI/CD)**

### **Step 1: Create `local.properties`** (NOT committed to Git)

```properties
# local.properties (add to .gitignore!)
api.base.url=http://192.168.11.105:3000/api/v1/
cert.password=visitor123
```

### **Step 2: Update `build.gradle.kts`** to read from `local.properties`

```kotlin
import java.util.Properties
import java.io.FileInputStream

android {
    ...

    // Load local.properties
    val localProperties = Properties()
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        localProperties.load(FileInputStream(localPropertiesFile))
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL",
                "\"${localProperties.getProperty("api.base.url", "http://localhost:3000/api/v1/")}\"")
            buildConfigField("String", "CERT_PASSWORD",
                "\"${localProperties.getProperty("cert.password", "visitor123")}\"")
        }

        release {
            // Use environment variables in CI/CD
            buildConfigField("String", "API_BASE_URL",
                "\"${System.getenv("API_BASE_URL") ?: "https://api.prod.com/api/v1/"}\"")
            buildConfigField("String", "CERT_PASSWORD",
                "\"${System.getenv("CERT_PASSWORD") ?: "ERROR_NO_PASSWORD"}\"")
        }
    }
}
```

### **Step 3: Update `.gitignore`**

```
# Secrets and local configuration
local.properties
*.keystore
*.jks
```

---

## **Option 3: Firebase Remote Config (Dynamic Configuration)**

### **Step 1: Add Firebase to project**

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("com.google.firebase:firebase-config-ktx:21.6.0")
}
```

### **Step 2: Initialize Remote Config**

```kotlin
// VisitorManagementApp.kt
class VisitorManagementApp : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize Firebase Remote Config
        val remoteConfig = Firebase.remoteConfig
        remoteConfig.setConfigSettingsAsync(
            remoteConfigSettings {
                minimumFetchIntervalInSeconds = 3600  // 1 hour
            }
        )

        // Set defaults
        remoteConfig.setDefaultsAsync(
            mapOf(
                "api_base_url" to "http://localhost:3000/api/v1/",
                "enable_mtls" to true
            )
        )

        // Fetch latest values
        remoteConfig.fetchAndActivate()
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val apiUrl = remoteConfig.getString("api_base_url")
                    SecureConfig.setApiBaseUrl(this, apiUrl)
                }
            }
    }
}
```

### **Step 3: Update RetrofitClient to use Remote Config**

```kotlin
object RetrofitClient {
    private var baseUrl: String = SecureConfig.getApiBaseUrl(applicationContext)

    // Allow dynamic URL updates from Remote Config
    fun updateBaseUrl(newUrl: String) {
        baseUrl = newUrl
        retrofit = createRetrofit()
        apiService = retrofit.create(ApiService::class.java)
    }
}
```

---

## **Production Deployment Checklist**

- [ ] Remove ALL hardcoded secrets from code
- [ ] Add `local.properties` to `.gitignore`
- [ ] Set up BuildConfig fields for API_BASE_URL and CERT_PASSWORD
- [ ] Create separate build variants (debug, staging, production)
- [ ] Store production certificate password in CI/CD secrets (GitHub Actions, GitLab CI, etc.)
- [ ] Use environment variables in CI/CD pipeline
- [ ] Enable code obfuscation with ProGuard/R8 for release builds
- [ ] Disable `usesCleartextTraffic` in production
- [ ] Test release build with production API
- [ ] Verify no secrets in APK using `apktool` or similar

---

## **CI/CD Environment Variables (GitHub Actions Example)**

```yaml
# .github/workflows/build.yml
name: Build Android App

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'terutium'

      - name: Build Release APK
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}           # Store in GitHub Secrets
          CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}         # Store in GitHub Secrets
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }} # For signing
        run: |
          chmod +x gradlew
          ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: app/build/outputs/apk/release/app-release.apk
```

---

## **Security Best Practices**

1. **Never commit secrets to Git**
   - Use `.gitignore` for `local.properties`, keystores, etc.
   - Use environment variables or secret management tools

2. **Use Android Keystore for sensitive data**
   - Store certificate passwords in encrypted SharedPreferences
   - Use `androidx.security:security-crypto` library

3. **Separate development and production configurations**
   - Different API URLs per build variant
   - Different signing keys (debug vs release)

4. **Enable code obfuscation**
   - Use R8/ProGuard to obfuscate code
   - Prevents reverse engineering

5. **Use HTTPS in production**
   - Disable `usesCleartextTraffic` for release builds
   - Enable certificate pinning for extra security

6. **Rotate secrets regularly**
   - Change certificate passwords quarterly
   - Update API keys and tokens

---

## **Quick Start (For Development)**

1. Create `local.properties` in project root:
   ```properties
   api.base.url=http://YOUR_IP:3000/api/v1/
   cert.password=visitor123
   ```

2. Update `build.gradle.kts` to read from `local.properties`

3. Update `Constants.kt` to use `BuildConfig.API_BASE_URL`

4. Update `RetrofitClient.kt` to use `BuildConfig.CERT_PASSWORD`

5. Build and run:
   ```bash
   ./gradlew assembleDebug
   ```

---

## **Additional Resources**

- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [BuildConfig Fields](https://developer.android.com/studio/build/gradle-tips#share-properties-with-the-manifest)
- [Firebase Remote Config](https://firebase.google.com/docs/remote-config)
- [ProGuard/R8 Documentation](https://developer.android.com/studio/build/shrink-code)
