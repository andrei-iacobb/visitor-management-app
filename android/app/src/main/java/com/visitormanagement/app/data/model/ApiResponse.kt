package com.visitormanagement.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Generic API response wrapper
 */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val errors: List<ValidationError>? = null,
    val error: String? = null,
    val count: Int? = null,
    val pagination: Pagination? = null
)

/**
 * Validation error from API
 */
data class ValidationError(
    val msg: String,
    val param: String,
    val location: String? = null
)

/**
 * Pagination info from API
 */
data class Pagination(
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerializedName("hasMore")
    val hasMore: Boolean
)

/**
 * Result wrapper for repository operations
 */
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception, val message: String? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

/**
 * Contractor verification response
 */
data class ContractorVerificationResponse(
    val success: Boolean,
    val allowed: Boolean,
    val message: String,
    val reason: String? = null,
    @SerializedName("contractorId")
    val contractorId: Int? = null
)

/**
 * Contractor verification request
 */
data class ContractorVerificationRequest(
    @SerializedName("company_name")
    val companyName: String,
    @SerializedName("contractor_name")
    val contractorName: String? = null
)

/**
 * Network exceptions
 */
class NetworkException(message: String) : Exception(message)
class ApiException(message: String, val code: Int? = null) : Exception(message)
class ValidationException(val errors: List<ValidationError>) : Exception("Validation failed")
class ContractorNotApprovedException(val reason: String?, message: String) : Exception(message)
