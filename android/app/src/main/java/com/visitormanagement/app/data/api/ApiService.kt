package com.visitormanagement.app.data.api

import com.visitormanagement.app.data.model.ApiResponse
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.model.SignInRequest
import com.visitormanagement.app.data.model.ContractorVerificationRequest
import com.visitormanagement.app.data.model.ContractorVerificationResponse
import com.visitormanagement.app.data.model.VisitorDocument
import com.visitormanagement.app.data.model.VisitorDocumentPDF
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
     * Get visitor acknowledgment document (text version)
     */
    @GET("documents/visitor-acknowledgment")
    suspend fun getVisitorDocument(): Response<ApiResponse<VisitorDocument>>

    /**
     * Get visitor acknowledgment document (PDF version with base64)
     */
    @GET("documents/visitor-acknowledgment/pdf/preview")
    suspend fun getVisitorDocumentPDF(): Response<ApiResponse<VisitorDocumentPDF>>

    /**
     * Get safety requirements PDF (comprehensive safety document)
     */
    @GET("documents/visitor-safety-requirements/pdf/preview")
    suspend fun getSafetyRequirementsPDF(): Response<ApiResponse<VisitorDocumentPDF>>

    /**
     * Log document acknowledgment
     */
    @POST("documents/acknowledge")
    suspend fun acknowledgeDocument(
        @Body request: Map<String, Any>? = null
    ): Response<ApiResponse<Any>>

    /**
     * Get PDF document by file name
     * @param fileName The PDF file name (e.g., "VISITOR_FORM.pdf")
     */
    @GET("documents/pdf/{fileName}")
    suspend fun getPDF(
        @Path("fileName") fileName: String
    ): Response<ApiResponse<VisitorDocumentPDF>>

    /**
     * Get default PDF (first available PDF in public folder)
     */
    @GET("documents/default")
    suspend fun getDefaultPDF(): Response<ApiResponse<VisitorDocumentPDF>>

    /**
     * List all available PDFs in public folder
     */
    @GET("documents/list")
    suspend fun listAvailablePDFs(): Response<ApiResponse<Any>>
}
