package com.visitormanagement.app.util

/**
 * Application-wide constants
 */
object Constants {
    // API Configuration
    // IMPORTANT: This is a fallback default URL for development only
    // For Android Emulator: use 10.0.2.2 to access host machine's localhost
    // For Physical Device: use your computer's IP address (e.g., 192.168.1.100)
    //
    // PRODUCTION: Use SecureConfig.getApiBaseUrl(context) for runtime configuration
    // See: android/app/src/main/java/com/visitormanagement/app/util/SecureConfig.kt
    // See: android/BUILD_CONFIG_PRODUCTION.md for production deployment guide
    //
    // TODO: PRODUCTION - Configure BuildConfig.API_BASE_URL in build.gradle
    // TODO: PRODUCTION - Use HTTPS instead of HTTP (SSL/TLS certificate required)
    // TODO: PRODUCTION - Implement certificate pinning for API security
    const val BASE_URL = "http://192.168.11.105:3000/api/"  // Development fallback only

    // Network timeouts
    const val TIMEOUT_SECONDS = 30L
    const val CONNECT_TIMEOUT_SECONDS = 15L
    const val WRITE_TIMEOUT_SECONDS = 30L

    // Image configuration
    const val MAX_IMAGE_SIZE_BYTES = 1024 * 1024 // 1MB
    const val IMAGE_QUALITY = 80 // JPEG quality (0-100)
    const val IMAGE_MAX_WIDTH = 1024
    const val IMAGE_MAX_HEIGHT = 1024

    // Camera
    const val CAMERA_PERMISSION_REQUEST_CODE = 100
    const val CAMERA_RESULT_CODE = 101

    // Signature
    const val SIGNATURE_RESULT_CODE = 102
    const val SIGNATURE_WIDTH = 800
    const val SIGNATURE_HEIGHT = 400

    // Intent extras
    const val EXTRA_VISITOR_TYPE = "visitor_type"
    const val EXTRA_PHOTO_DATA = "photo_data"
    const val EXTRA_SIGNATURE_DATA = "signature_data"

    // Shared Preferences
    // TODO: PRODUCTION - Implement dynamic API URL configuration via Shared Preferences
    // TODO: PRODUCTION - Allow configuration updates from admin dashboard without recompiling
    const val PREF_NAME = "visitor_management_prefs"
    const val PREF_API_BASE_URL = "api_base_url"

    // Auto-refresh interval for active visitors (milliseconds)
    const val AUTO_REFRESH_INTERVAL_MS = 30000L // 30 seconds
    const val CLOCK_UPDATE_INTERVAL_MS = 1000L // 1 second

    // Animation durations
    const val ANIM_DURATION_SHORT = 200L
    const val ANIM_DURATION_MEDIUM = 300L
    const val ANIM_DURATION_LONG = 500L

    // Success dialog auto-dismiss delay
    const val SUCCESS_DIALOG_DISMISS_DELAY_MS = 3000L

    // Vehicle checkout limits
    const val MAX_SINGLE_TRIP_MILES = 1000 // Maximum miles for a single trip

    // Image/PDF quality settings
    const val PNG_COMPRESSION_QUALITY = 100 // PNG quality (0-100), 100 = lossless

    // Data pagination limits
    const val LOGS_PAGE_LIMIT = 100 // Number of logs to fetch per page
    const val SHAREPOINT_SYNC_LIMIT = 1000 // Maximum records to sync to SharePoint

    // UI dimensions
    const val MIN_BUTTON_WIDTH_DP = 200 // Minimum button width in dp

    // HTTP Status Codes
    const val HTTP_SERVER_ERROR = 500
}

/**
 * API Endpoints
 */
object ApiEndpoints {
    const val SIGN_INS = "sign-ins"
    const val ACTIVE_SIGN_INS = "sign-ins/status/active"
    const val SIGN_OUT = "sign-ins/{id}/sign-out"
    const val STAFF = "staff"
}
