package com.visitormanagement.app.data.api

import android.content.Context
import android.util.Log
import com.google.gson.GsonBuilder
import com.visitormanagement.app.R
import com.visitormanagement.app.util.Constants
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.InputStream
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.CertificateFactory
import java.util.concurrent.TimeUnit
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/**
 * Retrofit client singleton with mTLS support
 */
object RetrofitClient {

    private const val TAG = "RetrofitClient"
    private var baseUrl: String = Constants.BASE_URL
    private lateinit var applicationContext: Context
    private var authToken: String? = null

    /**
     * Initialize with application context (call from Application class)
     */
    fun init(context: Context) {
        applicationContext = context.applicationContext
    }

    /**
     * Set JWT authentication token
     */
    fun setAuthToken(token: String?) {
        authToken = token
        // Recreate client with new token
        createOkHttpClient()
    }

    /**
     * Get current auth token
     */
    fun getAuthToken(): String? = authToken

    /**
     * Clear authentication token (logout)
     */
    fun clearAuthToken() {
        authToken = null
        createOkHttpClient()
    }

    /**
     * Authentication interceptor - Adds JWT token to requests
     */
    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val requestBuilder = original.newBuilder()

        // Add JWT token if available
        authToken?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }

        // Add request ID for tracking
        requestBuilder.addHeader("X-Request-ID", java.util.UUID.randomUUID().toString())

        val request = requestBuilder.build()
        chain.proceed(request)
    }

    /**
     * Logging interceptor for debugging
     */
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (com.visitormanagement.app.BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    /**
     * Load client certificate and CA certificate for mTLS
     */
    private fun getSslContext(): SSLContext? {
        return try {
            // Load client certificate (PKCS12)
            val clientCertInputStream: InputStream = applicationContext.resources.openRawResource(R.raw.client)
            val clientKeyStore = KeyStore.getInstance("PKCS12")
            clientKeyStore.load(clientCertInputStream, "visitor123".toCharArray())
            clientCertInputStream.close()

            // Initialize KeyManagerFactory with client certificate
            val keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
            keyManagerFactory.init(clientKeyStore, "visitor123".toCharArray())

            // Load CA certificate (PEM)
            val caCertInputStream: InputStream = applicationContext.resources.openRawResource(R.raw.ca_cert)
            val certificateFactory = CertificateFactory.getInstance("X.509")
            val caCert = certificateFactory.generateCertificate(caCertInputStream)
            caCertInputStream.close()

            // Create KeyStore with CA certificate
            val trustStore = KeyStore.getInstance(KeyStore.getDefaultType())
            trustStore.load(null, null)
            trustStore.setCertificateEntry("ca", caCert)

            // Initialize TrustManagerFactory
            val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
            trustManagerFactory.init(trustStore)

            // Create SSLContext
            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(
                keyManagerFactory.keyManagers,
                trustManagerFactory.trustManagers,
                SecureRandom()
            )

            Log.d(TAG, "mTLS configured successfully")
            sslContext
        } catch (e: Exception) {
            Log.e(TAG, "Failed to configure mTLS: ${e.message}", e)
            // Return null to fall back to default SSL (for development without certificates)
            null
        }
    }

    /**
     * Get TrustManager for certificate validation
     */
    private fun getTrustManager(): X509TrustManager? {
        return try {
            val caCertInputStream: InputStream = applicationContext.resources.openRawResource(R.raw.ca_cert)
            val certificateFactory = CertificateFactory.getInstance("X.509")
            val caCert = certificateFactory.generateCertificate(caCertInputStream)
            caCertInputStream.close()

            val trustStore = KeyStore.getInstance(KeyStore.getDefaultType())
            trustStore.load(null, null)
            trustStore.setCertificateEntry("ca", caCert)

            val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
            trustManagerFactory.init(trustStore)

            trustManagerFactory.trustManagers[0] as X509TrustManager
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get TrustManager: ${e.message}", e)
            null
        }
    }

    /**
     * OkHttp client with timeouts, logging, authentication, and mTLS
     */
    private var okHttpClient: OkHttpClient = createOkHttpClient()

    private fun createOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(Constants.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(Constants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(Constants.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)

        // Configure mTLS if certificates are available
        try {
            val sslContext = getSslContext()
            val trustManager = getTrustManager()

            if (sslContext != null && trustManager != null) {
                builder.sslSocketFactory(sslContext.socketFactory, trustManager)
                Log.d(TAG, "OkHttpClient configured with mTLS")
            } else {
                Log.w(TAG, "mTLS not configured - using default SSL")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring mTLS, falling back to default: ${e.message}", e)
        }

        val client = builder.build()
        okHttpClient = client

        // Recreate Retrofit with new client
        retrofit = createRetrofit()
        apiService = retrofit.create(ApiService::class.java)

        return client
    }

    /**
     * Gson converter with lenient parsing and snake_case naming
     */
    private val gson = GsonBuilder()
        .setLenient()
        .setFieldNamingPolicy(com.google.gson.FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
        .create()

    /**
     * Retrofit instance - recreated when base URL changes
     */
    private var retrofit: Retrofit = createRetrofit()

    /**
     * API service instance - recreated when base URL changes
     */
    var apiService: ApiService = retrofit.create(ApiService::class.java)
        private set

    /**
     * Create a new Retrofit instance with the current base URL
     */
    private fun createRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * Update base URL and recreate Retrofit and ApiService instances
     */
    fun updateBaseUrl(newBaseUrl: String) {
        baseUrl = if (newBaseUrl.endsWith("/")) newBaseUrl else "$newBaseUrl/"

        // Recreate Retrofit and ApiService with new base URL
        retrofit = createRetrofit()
        apiService = retrofit.create(ApiService::class.java)
    }

    /**
     * Get current base URL
     */
    fun getBaseUrl(): String = baseUrl
}
