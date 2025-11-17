package com.visitormanagement.app.ui.vehicle

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.data.model.*
import com.visitormanagement.app.ui.main.MainActivity
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class VehicleCheckoutActivity : AppCompatActivity() {

    private lateinit var etVehicleReg: AutoCompleteTextView
    private lateinit var btnLookup: MaterialButton
    private lateinit var clCheckoutForm: ConstraintLayout
    private lateinit var clCheckinForm: ConstraintLayout
    private lateinit var tvVehicleStatus: TextView
    private var currentVehicle: Vehicle? = null
    private var currentCheckout: VehicleCheckOut? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_vehicle_checkout)

        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        initializeViews()
        loadVehicleRegistrations()
        setupListeners()
    }

    private fun loadVehicleRegistrations() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getVehicleRegistrations()

                if (response.isSuccessful && response.body() != null) {
                    val registrations = response.body()!!.data ?: emptyList()

                    Log.d("VehicleCheckout", "Loaded ${registrations.size} vehicle registrations for autocomplete")

                    // Set up adapter for AutoCompleteTextView
                    val adapter = ArrayAdapter(
                        this@VehicleCheckoutActivity,
                        android.R.layout.simple_dropdown_item_1line,
                        registrations
                    )
                    etVehicleReg.setAdapter(adapter)

                    // Show dropdown on focus
                    etVehicleReg.setOnFocusChangeListener { _, hasFocus ->
                        if (hasFocus && registrations.isNotEmpty()) {
                            etVehicleReg.showDropDown()
                        }
                    }
                } else {
                    Log.w("VehicleCheckout", "Failed to load vehicle registrations: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("VehicleCheckout", "Error loading vehicle registrations", e)
                // Non-critical - user can still type manually
            }
        }
    }

    private fun initializeViews() {
        etVehicleReg = findViewById(R.id.etVehicleReg)
        btnLookup = findViewById(R.id.btnLookupVehicle)
        clCheckoutForm = findViewById(R.id.clCheckoutForm)
        clCheckinForm = findViewById(R.id.clCheckinForm)
        tvVehicleStatus = findViewById(R.id.tvVehicleStatus)
    }

    private fun setupListeners() {
        btnLookup.setOnClickListener { lookupVehicle() }
        findViewById<MaterialButton>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun lookupVehicle() {
        val reg = etVehicleReg.text.toString().trim().uppercase()

        if (reg.isEmpty()) {
            showError("Please enter a vehicle registration")
            return
        }

        tvVehicleStatus.text = getString(R.string.checking_vehicle_status)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getVehicleStatus(reg)

                if (response.isSuccessful) {
                    val vehicleStatus = response.body()?.data
                    if (vehicleStatus != null) {
                        currentVehicle = vehicleStatus.vehicle

                        if (vehicleStatus.isAvailable) {
                            showCheckoutForm()
                        } else {
                            currentCheckout = vehicleStatus.lastCheckout
                            showCheckinForm()
                        }
                    } else {
                        showError(getString(R.string.error_vehicle_not_found))
                    }
                } else {
                    showError(getString(R.string.error_vehicle_not_found))
                }
            } catch (e: Exception) {
                showError("Error: ${e.message}")
            }
        }
    }

    private fun showCheckoutForm() {
        tvVehicleStatus.text = getString(R.string.vehicle_available)
        clCheckoutForm.visibility = LinearLayout.VISIBLE
        clCheckinForm.visibility = LinearLayout.GONE

        // Setup checkout form
        val etCompany = findViewById<TextInputEditText>(R.id.etCompanyName)
        val etDriver = findViewById<TextInputEditText>(R.id.etDriverName)
        val etMileage = findViewById<TextInputEditText>(R.id.etStartingMileage)
        val btnCheckout = findViewById<MaterialButton>(R.id.btnCheckoutVehicle)

        btnCheckout.setOnClickListener {
            val company = etCompany.text.toString().trim()
            val driver = etDriver.text.toString().trim()
            val mileage = etMileage.text.toString().trim()

            when {
                company.isEmpty() -> showError("Please enter company name")
                driver.isEmpty() -> showError("Please enter driver name")
                mileage.isEmpty() -> showError("Please enter mileage")
                mileage.toIntOrNull() == null || mileage.toInt() < 0 ->
                    showError(getString(R.string.error_invalid_mileage))
                mileage.toInt() > 999999 ->
                    showError("Starting mileage value is unrealistic. Maximum allowed is 999,999 miles")
                currentVehicle != null && currentVehicle!!.currentMileage != null && mileage.toInt() < currentVehicle!!.currentMileage!! ->
                    showError("Starting mileage (${mileage.toInt()}) cannot be less than vehicle's current mileage (${currentVehicle!!.currentMileage})")
                else -> showTermsAndConditions(company, driver, mileage.toInt())
            }
        }
    }

    private fun showCheckinForm() {
        tvVehicleStatus.text = getString(R.string.vehicle_in_use)
        clCheckoutForm.visibility = LinearLayout.GONE
        clCheckinForm.visibility = LinearLayout.VISIBLE

        // Setup checkin form
        val etDriver = findViewById<TextInputEditText>(R.id.etReturnDriver)
        val etMileage = findViewById<TextInputEditText>(R.id.etReturnMileage)
        val btnCheckin = findViewById<MaterialButton>(R.id.btnCheckinVehicle)

        btnCheckin.setOnClickListener {
            val driver = etDriver.text.toString().trim()
            val mileage = etMileage.text.toString().trim()

            when {
                driver.isEmpty() -> showError("Please enter driver name")
                mileage.isEmpty() -> showError("Please enter return mileage")
                mileage.toIntOrNull() == null || mileage.toInt() < 0 ->
                    showError(getString(R.string.error_invalid_mileage))
                currentCheckout != null && mileage.toInt() < currentCheckout!!.startingMileage ->
                    showError("Return mileage (${mileage.toInt()}) cannot be less than starting mileage (${currentCheckout!!.startingMileage})")
                mileage.toInt() > 999999 ->
                    showError("Mileage value is unrealistic. Maximum allowed is 999,999 miles")
                currentCheckout != null && (mileage.toInt() - currentCheckout!!.startingMileage) > Constants.MAX_SINGLE_TRIP_MILES ->
                    showError("Distance traveled (${mileage.toInt() - currentCheckout!!.startingMileage} miles) exceeds maximum single trip of ${Constants.MAX_SINGLE_TRIP_MILES} miles. Please verify mileage.")
                else -> submitCheckin(driver, mileage.toInt())
            }
        }
    }

    private fun showTermsAndConditions(company: String, driver: String, mileage: Int) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.vehicle_terms_title))
            .setMessage(getString(R.string.vehicle_terms_text))
            .setPositiveButton(getString(R.string.btn_acknowledge_terms)) { _, _ ->
                submitCheckout(company, driver, mileage)
            }
            .setNegativeButton(getString(R.string.btn_cancel), null)
            .show()
    }

    private fun submitCheckout(company: String, driver: String, mileage: Int) {
        tvVehicleStatus.text = getString(R.string.submitting_checkout)

        val now = Calendar.getInstance()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

        val request = VehicleCheckOutRequest(
            registration = currentVehicle?.registration ?: "",
            checkoutDate = dateFormat.format(now.time),
            checkoutTime = timeFormat.format(now.time),
            companyName = company,
            driverName = driver,
            startingMileage = mileage,
            signature = null,
            acknowledgedTerms = true,
            acknowledgmentTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(now.time)
        )

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.checkoutVehicle(request)

                if (response.isSuccessful) {
                    val checkout = response.body()?.data
                    if (checkout != null) {
                        showCheckoutSuccess(checkout)
                    } else {
                        showError(getString(R.string.error_checkout_failed))
                    }
                } else {
                    showError(getString(R.string.error_checkout_failed))
                }
            } catch (e: Exception) {
                showError("Error: ${e.message}")
            }
        }
    }

    private fun submitCheckin(driver: String, mileage: Int) {
        tvVehicleStatus.text = getString(R.string.submitting_checkin)

        val now = Calendar.getInstance()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

        val request = VehicleCheckInRequest(
            registration = currentVehicle?.registration ?: "",
            checkinDate = dateFormat.format(now.time),
            checkinTime = timeFormat.format(now.time),
            returnMileage = mileage,
            driverName = driver
        )

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.checkinVehicle(request)

                if (response.isSuccessful) {
                    val checkin = response.body()?.data
                    if (checkin != null) {
                        showCheckinSuccess(checkin)
                    } else {
                        showError(getString(R.string.error_checkin_failed))
                    }
                } else {
                    showError(getString(R.string.error_checkin_failed))
                }
            } catch (e: Exception) {
                showError("Error: ${e.message}")
            }
        }
    }

    private fun showCheckoutSuccess(checkout: VehicleCheckOut) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.vehicle_thank_you_title))
            .setMessage(getString(R.string.vehicle_checkout_thank_you))
            .setPositiveButton("OK") { _, _ ->
                startActivity(Intent(this, MainActivity::class.java))
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun showCheckinSuccess(checkin: VehicleCheckIn) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.vehicle_thank_you_title))
            .setMessage(getString(R.string.vehicle_checkin_thank_you))
            .setPositiveButton(getString(R.string.btn_report_damage)) { _, _ ->
                showDamageReportForm(checkin.id ?: 0)
            }
            .setNeutralButton(getString(R.string.btn_return_home)) { _, _ ->
                startActivity(Intent(this, MainActivity::class.java))
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun showDamageReportForm(checkinId: Int) {
        val view = layoutInflater.inflate(R.layout.dialog_vehicle_damage, null)
        val etDescription = view.findViewById<TextInputEditText>(R.id.etDamageDescription)
        val etReportedBy = view.findViewById<TextInputEditText>(R.id.etReportedBy)

        AlertDialog.Builder(this)
            .setTitle(getString(R.string.vehicle_damage_title))
            .setView(view)
            .setPositiveButton(getString(R.string.btn_submit_damage_report)) { _, _ ->
                val description = etDescription.text.toString().trim()
                val reportedBy = etReportedBy.text.toString().trim()

                when {
                    description.isEmpty() -> showError("Please describe the damage")
                    reportedBy.isEmpty() -> showError("Please enter your name")
                    else -> submitDamageReport(checkinId, description, reportedBy)
                }
            }
            .setNegativeButton(getString(R.string.btn_return_home)) { _, _ ->
                startActivity(Intent(this, MainActivity::class.java))
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun submitDamageReport(checkinId: Int, description: String, reportedBy: String) {
        val now = Calendar.getInstance()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

        val request = VehicleDamageRequest(
            checkinId = checkinId,
            damageDescription = description,
            reportedByName = reportedBy,
            reportDate = dateFormat.format(now.time),
            reportTime = timeFormat.format(now.time)
        )

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.reportVehicleDamage(request)

                if (response.isSuccessful) {
                    AlertDialog.Builder(this@VehicleCheckoutActivity)
                        .setTitle(getString(R.string.vehicle_damage_reported))
                        .setMessage(getString(R.string.vehicle_damage_reported_message))
                        .setPositiveButton("OK") { _, _ ->
                            startActivity(Intent(this@VehicleCheckoutActivity, MainActivity::class.java))
                            finish()
                        }
                        .setCancelable(false)
                        .show()
                } else {
                    showError(getString(R.string.error_damage_report_failed))
                }
            } catch (e: Exception) {
                showError("Error: ${e.message}")
            }
        }
    }

    private fun showError(message: String) {
        AlertDialog.Builder(this)
            .setTitle("Error")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
}
