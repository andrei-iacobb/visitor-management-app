package com.visitormanagement.app.data.api

import com.visitormanagement.app.data.model.ApiResponse
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.model.SignInRequest
import retrofit2.Response
import retrofit2.http.*

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
}
