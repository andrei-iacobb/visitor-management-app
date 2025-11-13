package com.visitormanagement.app.data.api

import com.google.gson.GsonBuilder
import com.visitormanagement.app.util.Constants
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Retrofit client singleton
 */
object RetrofitClient {

    private var baseUrl: String = Constants.BASE_URL

    /**
     * Logging interceptor for debugging
     * TODO: PRODUCTION - Disable verbose logging in production builds
     * TODO: PRODUCTION - Use ProGuard/R8 to strip sensitive HTTP logs from release APKs
     * TODO: PRODUCTION - Implement conditional logging based on BuildConfig.DEBUG
     */
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    /**
     * OkHttp client with timeouts and logging
     * TODO: PRODUCTION - Add certificate pinning for HTTPS security
     * TODO: PRODUCTION - Implement request/response interceptors for authentication tokens
     * TODO: PRODUCTION - Add network interceptor to handle proxy authentication if required
     * TODO: PRODUCTION - Configure connection pool for containerized backend (adjust pool size for throughput)
     */
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(Constants.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(Constants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(Constants.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

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
