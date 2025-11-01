package com.visitormanagement.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data model for visitor/contractor sign-in
 */
data class SignIn(
    val id: Int? = null,

    @SerializedName("visitor_type")
    val visitorType: String, // "visitor" or "contractor"

    @SerializedName("full_name")
    val fullName: String,

    @SerializedName("phone_number")
    val phoneNumber: String,

    val email: String? = null,

    @SerializedName("company_name")
    val companyName: String? = null,

    @SerializedName("purpose_of_visit")
    val purposeOfVisit: String,

    @SerializedName("car_registration")
    val carRegistration: String? = null,

    @SerializedName("visiting_person")
    val visitingPerson: String,

    val photo: String? = null, // Base64 encoded image

    val signature: String? = null, // Base64 encoded signature

    @SerializedName("sign_in_time")
    val signInTime: String? = null,

    @SerializedName("sign_out_time")
    val signOutTime: String? = null,

    val status: String? = null // "signed_in" or "signed_out"
)

/**
 * Request model for creating a sign-in
 */
data class SignInRequest(
    @SerializedName("visitor_type")
    val visitorType: String,

    @SerializedName("full_name")
    val fullName: String,

    @SerializedName("phone_number")
    val phoneNumber: String,

    val email: String? = null,

    @SerializedName("company_name")
    val companyName: String? = null,

    @SerializedName("purpose_of_visit")
    val purposeOfVisit: String,

    @SerializedName("car_registration")
    val carRegistration: String? = null,

    @SerializedName("visiting_person")
    val visitingPerson: String,

    val photo: String? = null,

    val signature: String? = null,

    @SerializedName("document_acknowledged")
    val documentAcknowledged: Boolean = false,

    @SerializedName("document_acknowledgment_time")
    val documentAcknowledgmentTime: String? = null
)

/**
 * Constants for visitor types
 */
object VisitorType {
    const val VISITOR = "visitor"
    const val CONTRACTOR = "contractor"
}

/**
 * Constants for sign-in status
 */
object SignInStatus {
    const val SIGNED_IN = "signed_in"
    const val SIGNED_OUT = "signed_out"
}
