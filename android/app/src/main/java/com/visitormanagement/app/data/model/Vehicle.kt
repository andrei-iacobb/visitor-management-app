package com.visitormanagement.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Vehicle information
 */
data class Vehicle(
    val id: Int? = null,

    val registration: String,

    val status: String? = "available", // "available" or "in_use"

    @SerializedName("current_mileage")
    val currentMileage: Int? = null,

    @SerializedName("checkout_id")
    val checkoutId: Int? = null,

    @SerializedName("last_checkout_time")
    val lastCheckoutTime: String? = null
)

/**
 * Vehicle checkout request (vehicle going out)
 */
data class VehicleCheckOutRequest(
    val registration: String,

    @SerializedName("checkout_date")
    val checkoutDate: String, // System generated

    @SerializedName("checkout_time")
    val checkoutTime: String, // System generated

    @SerializedName("company_name")
    val companyName: String,

    @SerializedName("driver_name")
    val driverName: String,

    @SerializedName("starting_mileage")
    val startingMileage: Int,

    val signature: String? = null, // Base64 encoded signature

    @SerializedName("acknowledged_terms")
    val acknowledgedTerms: Boolean = false,

    @SerializedName("acknowledgment_time")
    val acknowledgmentTime: String? = null
)

/**
 * Vehicle checkout response
 */
data class VehicleCheckOut(
    val id: Int? = null,

    val registration: String,

    @SerializedName("checkout_date")
    val checkoutDate: String,

    @SerializedName("checkout_time")
    val checkoutTime: String,

    @SerializedName("company_name")
    val companyName: String,

    @SerializedName("driver_name")
    val driverName: String,

    @SerializedName("starting_mileage")
    val startingMileage: Int,

    val signature: String? = null,

    @SerializedName("acknowledged_terms")
    val acknowledgedTerms: Boolean = false,

    @SerializedName("acknowledgment_time")
    val acknowledgmentTime: String? = null,

    val status: String? = "checked_out" // "checked_out" or "returned"
)

/**
 * Vehicle check-in request (vehicle coming back)
 */
data class VehicleCheckInRequest(
    val registration: String,

    @SerializedName("checkin_date")
    val checkinDate: String, // System generated

    @SerializedName("checkin_time")
    val checkinTime: String, // System generated

    @SerializedName("return_mileage")
    val returnMileage: Int,

    @SerializedName("driver_name")
    val driverName: String
)

/**
 * Vehicle check-in response
 */
data class VehicleCheckIn(
    val id: Int? = null,

    val registration: String,

    @SerializedName("checkin_date")
    val checkinDate: String,

    @SerializedName("checkin_time")
    val checkinTime: String,

    @SerializedName("return_mileage")
    val returnMileage: Int,

    @SerializedName("driver_name")
    val driverName: String,

    @SerializedName("checkout_id")
    val checkoutId: Int? = null,

    val status: String? = "checked_in" // "checked_in"
)

/**
 * Vehicle damage report request
 */
data class VehicleDamageRequest(
    @SerializedName("checkin_id")
    val checkinId: Int,

    @SerializedName("damage_description")
    val damageDescription: String,

    @SerializedName("damage_photos")
    val damagePhotos: List<String>? = null, // Base64 encoded images

    @SerializedName("reported_by_name")
    val reportedByName: String,

    @SerializedName("report_date")
    val reportDate: String, // System generated

    @SerializedName("report_time")
    val reportTime: String // System generated
)

/**
 * Vehicle damage report response
 */
data class VehicleDamage(
    val id: Int? = null,

    @SerializedName("checkin_id")
    val checkinId: Int,

    @SerializedName("damage_description")
    val damageDescription: String,

    @SerializedName("damage_photos")
    val damagePhotos: List<String>? = null,

    @SerializedName("reported_by_name")
    val reportedByName: String,

    @SerializedName("report_date")
    val reportDate: String,

    @SerializedName("report_time")
    val reportTime: String,

    val status: String? = "reported"
)

/**
 * Vehicle status response
 */
data class VehicleStatusResponse(
    val vehicle: Vehicle,

    @SerializedName("is_available")
    val isAvailable: Boolean,

    @SerializedName("last_checkout")
    val lastCheckout: VehicleCheckOut? = null
)
