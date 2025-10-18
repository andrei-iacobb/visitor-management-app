package com.visitormanagement.app.data.repository

import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response

/**
 * Repository for visitor management data operations
 */
class VisitorRepository {

    private val apiService = RetrofitClient.apiService

    /**
     * Create a new sign-in
     */
    suspend fun createSignIn(request: SignInRequest): Result<SignIn> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.createSignIn(request)
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to create sign-in")
        }
    }

    /**
     * Get active visitors
     */
    suspend fun getActiveVisitors(): Result<List<SignIn>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getActiveVisitors()
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to fetch active visitors")
        }
    }

    /**
     * Sign out a visitor
     */
    suspend fun signOutVisitor(id: Int): Result<SignIn> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.signOutVisitor(id)
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to sign out visitor")
        }
    }

    /**
     * Get all sign-ins with optional filters
     */
    suspend fun getSignIns(
        status: String? = null,
        visitorType: String? = null,
        limit: Int? = 50,
        offset: Int? = 0
    ): Result<List<SignIn>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getSignIns(status, visitorType, limit, offset)
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to fetch sign-ins")
        }
    }

    /**
     * Get a single sign-in by ID
     */
    suspend fun getSignIn(id: Int): Result<SignIn> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getSignIn(id)
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to fetch sign-in")
        }
    }

    /**
     * Delete a sign-in
     */
    suspend fun deleteSignIn(id: Int): Result<SignIn> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.deleteSignIn(id)
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Failed to delete sign-in")
        }
    }

    /**
     * Check API health
     */
    suspend fun healthCheck(): Result<Any> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.healthCheck()
            handleResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Server is unreachable")
        }
    }

    /**
     * Handle API response and extract data or errors
     */
    private fun <T> handleResponse(response: Response<ApiResponse<T>>): Result<T> {
        return try {
            if (response.isSuccessful) {
                val apiResponse = response.body()
                if (apiResponse?.success == true && apiResponse.data != null) {
                    Result.Success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse?.message
                        ?: apiResponse?.error
                        ?: "Unknown error occurred"

                    // Check for validation errors
                    if (!apiResponse?.errors.isNullOrEmpty()) {
                        Result.Error(
                            ValidationException(apiResponse!!.errors!!),
                            "Validation failed"
                        )
                    } else {
                        Result.Error(ApiException(errorMsg, response.code()), errorMsg)
                    }
                }
            } else {
                val errorMsg = when (response.code()) {
                    400 -> "Bad request - Please check your input"
                    401 -> "Unauthorized access"
                    403 -> "Forbidden"
                    404 -> "Not found"
                    409 -> "Conflict - Record already exists"
                    500 -> "Server error - Please try again later"
                    503 -> "Service unavailable"
                    else -> "Error: ${response.code()}"
                }
                Result.Error(ApiException(errorMsg, response.code()), errorMsg)
            }
        } catch (e: Exception) {
            Result.Error(e, "Failed to process response")
        }
    }
}
