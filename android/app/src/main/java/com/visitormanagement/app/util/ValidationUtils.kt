package com.visitormanagement.app.util

import android.util.Patterns

/**
 * Utility class for input validation
 */
object ValidationUtils {

    /**
     * Validate full name
     */
    fun isValidName(name: String?): Boolean {
        return !name.isNullOrBlank() && name.trim().length >= 2
    }

    /**
     * Validate phone number
     */
    fun isValidPhone(phone: String?): Boolean {
        if (phone.isNullOrBlank()) return false

        // Remove all non-digit characters
        val digitsOnly = phone.replace(Regex("[^0-9]"), "")

        // Check if it has at least 10 digits
        return digitsOnly.length >= 10
    }

    /**
     * Validate email address
     */
    fun isValidEmail(email: String?): Boolean {
        if (email.isNullOrBlank()) return true // Email is optional

        return Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()
    }

    /**
     * Get name validation error message
     */
    fun getNameError(name: String?): String? {
        return when {
            name.isNullOrBlank() -> "Name is required"
            name.trim().length < 2 -> "Name must be at least 2 characters"
            else -> null
        }
    }

    /**
     * Get phone validation error message
     */
    fun getPhoneError(phone: String?): String? {
        return when {
            phone.isNullOrBlank() -> "Phone number is required"
            !isValidPhone(phone) -> "Invalid phone number"
            else -> null
        }
    }

    /**
     * Get email validation error message
     */
    fun getEmailError(email: String?): String? {
        return when {
            email.isNullOrBlank() -> null // Email is optional
            !isValidEmail(email) -> "Invalid email address"
            else -> null
        }
    }

    /**
     * Validate required text field
     */
    fun isRequired(text: String?): Boolean {
        return !text.isNullOrBlank()
    }

    /**
     * Get required field error message
     */
    fun getRequiredError(fieldName: String, value: String?): String? {
        return if (value.isNullOrBlank()) "$fieldName is required" else null
    }

    /**
     * Format phone number for display (e.g., (555) 123-4567)
     */
    fun formatPhoneNumber(phone: String?): String {
        if (phone.isNullOrBlank()) return ""

        val digitsOnly = phone.replace(Regex("[^0-9]"), "")

        return when {
            digitsOnly.length <= 3 -> digitsOnly
            digitsOnly.length <= 6 -> "(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3)}"
            digitsOnly.length <= 10 -> "(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}"
            else -> "(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6, 10)}"
        }
    }

    /**
     * Clean phone number (remove formatting, keep only digits and + symbol)
     */
    fun cleanPhoneNumber(phone: String?): String {
        if (phone.isNullOrBlank()) return ""
        return phone.replace(Regex("[^0-9+]"), "")
    }

    /**
     * Trim all whitespace from string
     */
    fun trimWhitespace(text: String?): String {
        return text?.trim() ?: ""
    }
}
