package com.visitormanagement.app.data.api

import com.visitormanagement.app.data.model.ApiResponse
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.model.SignInRequest
import com.visitormanagement.app.data.model.ContractorVerificationRequest
import com.visitormanagement.app.data.model.ContractorVerificationResponse
import com.visitormanagement.app.data.model.Vehicle
import com.visitormanagement.app.data.model.VehicleStatusResponse
import com.visitormanagement.app.data.model.VehicleCheckOut
import com.visitormanagement.app.data.model.VehicleCheckOutRequest
import com.visitormanagement.app.data.model.VehicleCheckIn
import com.visitormanagement.app.data.model.VehicleCheckInRequest
import com.visitormanagement.app.data.model.VehicleDamage
import com.visitormanagement.app.data.model.VehicleDamageRequest
import retrofit2.Response
import retrofit2.http.*
import okhttp3.ResponseBody

/**
 * Retrofit API service interface
 */
interface ApiService {

    /**
     * Create a new sign-in record
     */
    @POST("sign-ins")
    suspend fun createSignIn(
        @Body request: SignInRequest
    ): Response<ApiResponse<SignIn>>

    /**
     * Get all sign-ins with optional filters
     */
    @GET("sign-ins")
    suspend fun getSignIns(
        @Query("status") status: String? = null,
        @Query("visitor_type") visitorType: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<ApiResponse<List<SignIn>>>

    /**
     * Get currently active (signed-in) visitors
     */
    @GET("sign-ins/status/active")
    suspend fun getActiveVisitors(): Response<ApiResponse<List<SignIn>>>

    /**
     * Get a single sign-in by ID
     */
    @GET("sign-ins/{id}")
    suspend fun getSignIn(
        @Path("id") id: Int
    ): Response<ApiResponse<SignIn>>

    /**
     * Sign out a visitor
     */
    @PUT("sign-ins/{id}/sign-out")
    suspend fun signOutVisitor(
        @Path("id") id: Int
    ): Response<ApiResponse<SignIn>>

    /**
     * Delete a sign-in record
     */
    @DELETE("sign-ins/{id}")
    suspend fun deleteSignIn(
        @Path("id") id: Int
    ): Response<ApiResponse<SignIn>>

    /**
     * Verify if a contractor is approved
     */
    @POST("contractors/verify")
    suspend fun verifyContractor(
        @Body request: ContractorVerificationRequest
    ): Response<ContractorVerificationResponse>

    /**
     * Get all approved contractors
     */
    @GET("contractors/approved")
    suspend fun getApprovedContractors(
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<ApiResponse<Any>>

    /**
     * Health check endpoint
     */
    @GET("/health")
    suspend fun healthCheck(): Response<ApiResponse<Any>>

    /**
     * Sync all records to SharePoint
     */
    @POST("sharepoint/sync")
    suspend fun syncToSharePoint(): Response<ApiResponse<Any>>

    /**
     * Read data from SharePoint
     */
    @GET("sharepoint/read")
    suspend fun readFromSharePoint(): Response<ApiResponse<Any>>

    /**
     * List all available PDFs
     */
    @GET("documents/list")
    suspend fun listAvailablePDFs(): Response<ApiResponse<Any>>

    /**
     * Get document file (image, PDF, etc) by filename
     */
    @GET("documents/{fileName}")
    suspend fun getDocument(
        @Path("fileName") fileName: String
    ): Response<ResponseBody>

    /**
     * Check vehicle status by registration
     */
    @GET("vehicles/{registration}")
    suspend fun getVehicleStatus(
        @Path("registration") registration: String
    ): Response<ApiResponse<VehicleStatusResponse>>

    /**
     * Checkout a vehicle (vehicle going out)
     */
    @POST("vehicles/checkout")
    suspend fun checkoutVehicle(
        @Body request: VehicleCheckOutRequest
    ): Response<ApiResponse<VehicleCheckOut>>

    /**
     * Check-in a vehicle (vehicle coming back)
     */
    @POST("vehicles/checkin")
    suspend fun checkinVehicle(
        @Body request: VehicleCheckInRequest
    ): Response<ApiResponse<VehicleCheckIn>>

    /**
     * Report vehicle damage
     */
    @POST("vehicles/damage")
    suspend fun reportVehicleDamage(
        @Body request: VehicleDamageRequest
    ): Response<ApiResponse<VehicleDamage>>

}
