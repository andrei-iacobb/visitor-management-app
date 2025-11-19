package com.visitormanagement.app

import android.app.Application
import android.content.Context
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.util.SecureConfig

/**
 * Custom Application class to initialize app-wide configurations
 */
class VisitorManagementApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize RetrofitClient with application context
        RetrofitClient.init(this)

        // Load saved API URL from SharedPreferences and apply it
        loadSavedApiUrl()
    }

    /**
     * Load the saved API URL from SharedPreferences and update RetrofitClient
     * Uses SecureConfig for secure, environment-specific configuration
     */
    private fun loadSavedApiUrl() {
        val sharedPref = getSharedPreferences(
            Constants.PREF_NAME,
            Context.MODE_PRIVATE
        )

        val savedUrl = sharedPref.getString(Constants.PREF_API_BASE_URL, null)

        if (savedUrl != null && savedUrl.isNotEmpty()) {
            // User has saved a custom URL, use it
            RetrofitClient.updateBaseUrl(savedUrl)
        } else {
            // No saved URL, load from SecureConfig (supports BuildConfig and encrypted SharedPreferences)
            val defaultUrl = SecureConfig.getApiBaseUrl(this)
            RetrofitClient.updateBaseUrl(defaultUrl)

            // Save the default to SharedPreferences so it shows in settings
            with(sharedPref.edit()) {
                putString(Constants.PREF_API_BASE_URL, defaultUrl)
                apply()
            }
        }
    }
}
