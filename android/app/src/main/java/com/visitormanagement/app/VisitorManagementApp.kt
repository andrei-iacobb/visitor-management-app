package com.visitormanagement.app

import android.app.Application
import android.content.Context
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.util.Constants

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
            // No saved URL, use the default from Constants
            RetrofitClient.updateBaseUrl(Constants.BASE_URL)

            // Save the default to SharedPreferences so it shows in settings
            with(sharedPref.edit()) {
                putString(Constants.PREF_API_BASE_URL, Constants.BASE_URL)
                apply()
            }
        }
    }
}
