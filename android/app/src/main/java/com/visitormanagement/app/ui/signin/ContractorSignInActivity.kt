package com.visitormanagement.app.ui.signin

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.LinearLayout
import com.google.android.flexbox.FlexboxLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.data.model.*
import com.visitormanagement.app.data.repository.VisitorRepository
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.util.ValidationUtils
import com.visitormanagement.app.ui.signature.PdfSignatureDialog
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * Two-step contractor sign-in activity
 * Step 1: Enter company name
 * Step 2: Select contractor from approved list
 * Step 3: Fill additional information (phone, purpose, etc)
 */
class ContractorSignInActivity : AppCompatActivity() {

    private lateinit var repository: VisitorRepository

    // Current step in the flow (1, 2, or 3)
    private var currentStep = 1

    // Selected contractor from step 2
    private var selectedContractor: Contractor? = null

    // Step containers
    private lateinit var step1Container: View
    private lateinit var step2Container: View
    private lateinit var step3Container: View

    // Step 1 views (Company Name)
    private lateinit var tilCompanyStep1: TextInputLayout
    private lateinit var etCompanyStep1: AutoCompleteTextView
    private lateinit var btnNextStep1: MaterialButton

    // Step 2 views (Contractor Selection)
    private lateinit var tvCompanyNameStep2: TextView
    private lateinit var contractorButtonsContainer: FlexboxLayout
    private lateinit var btnBackStep2: MaterialButton

    // Step 3 views (Additional Info)
    private lateinit var tvSelectedContractorName: TextView
    private lateinit var tilPhone: TextInputLayout
    private lateinit var tilPurpose: TextInputLayout
    private lateinit var tilCarReg: TextInputLayout
    private lateinit var tilEmail: TextInputLayout
    private lateinit var etPhone: TextInputEditText
    private lateinit var etPurpose: TextInputEditText
    private lateinit var etCarReg: TextInputEditText
    private lateinit var etEmail: TextInputEditText
    private lateinit var btnBackStep3: MaterialButton
    private lateinit var btnSubmitStep3: MaterialButton

    // Common views
    private lateinit var progressBar: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_contractor_sign_in)

        // Force landscape orientation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        // Initialize repository
        repository = VisitorRepository()

        // Initialize views
        initViews()

        // Load company names for autocomplete
        loadCompanyNames()

        // Show step 1
        showStep(1)

        // Setup listeners
        setupListeners()
    }

    private fun loadCompanyNames() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getCompanyNames()

                if (response.isSuccessful && response.body() != null) {
                    val companies = response.body()!!.data ?: emptyList()

                    Log.d("ContractorSignIn", "Loaded ${companies.size} company names for autocomplete")

                    // Set up adapter for AutoCompleteTextView
                    val adapter = ArrayAdapter(
                        this@ContractorSignInActivity,
                        android.R.layout.simple_dropdown_item_1line,
                        companies
                    )
                    etCompanyStep1.setAdapter(adapter)

                    // Show dropdown on focus
                    etCompanyStep1.setOnFocusChangeListener { _, hasFocus ->
                        if (hasFocus && companies.isNotEmpty()) {
                            etCompanyStep1.showDropDown()
                        }
                    }
                } else {
                    Log.w("ContractorSignIn", "Failed to load company names: ${response.code()}")
                    Toast.makeText(
                        this@ContractorSignInActivity,
                        "Unable to load company suggestions. You can still type manually.",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Log.e("ContractorSignIn", "Error loading company names", e)
                Toast.makeText(
                    this@ContractorSignInActivity,
                    "Unable to load company suggestions. You can still type manually.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun initViews() {
        // Step containers
        step1Container = findViewById(R.id.step1Container)
        step2Container = findViewById(R.id.step2Container)
        step3Container = findViewById(R.id.step3Container)

        // Step 1 views
        tilCompanyStep1 = findViewById(R.id.tilCompanyStep1)
        etCompanyStep1 = findViewById(R.id.etCompanyStep1)
        btnNextStep1 = findViewById(R.id.btnNextStep1)

        // Step 2 views
        tvCompanyNameStep2 = findViewById(R.id.tvCompanyNameStep2)
        contractorButtonsContainer = findViewById(R.id.contractorButtonsContainer)
        btnBackStep2 = findViewById(R.id.btnBackStep2)

        // Step 3 views
        tvSelectedContractorName = findViewById(R.id.tvSelectedContractorName)
        tilPhone = findViewById(R.id.tilPhone)
        tilPurpose = findViewById(R.id.tilPurpose)
        tilCarReg = findViewById(R.id.tilCarReg)
        tilEmail = findViewById(R.id.tilEmail)
        etPhone = findViewById(R.id.etPhone)
        etPurpose = findViewById(R.id.etPurpose)
        etCarReg = findViewById(R.id.etCarReg)
        etEmail = findViewById(R.id.etEmail)
        btnBackStep3 = findViewById(R.id.btnBackStep3)
        btnSubmitStep3 = findViewById(R.id.btnSubmitStep3)

        // Common views
        progressBar = findViewById(R.id.progressBar)
    }

    private fun setupListeners() {
        // Back button (top)
        findViewById<View>(R.id.btnBack).setOnClickListener {
            finish()
        }

        // Step 1: Next button
        btnNextStep1.setOnClickListener {
            validateAndProceedFromStep1()
        }

        // Step 2: Back button
        btnBackStep2.setOnClickListener {
            showStep(1)
        }

        // Step 3: Back button
        btnBackStep3.setOnClickListener {
            showStep(2)
        }

        // Step 3: Submit button
        btnSubmitStep3.setOnClickListener {
            validateAndSubmitStep3()
        }
    }

    private fun showStep(step: Int) {
        currentStep = step

        // Hide all steps
        step1Container.visibility = View.GONE
        step2Container.visibility = View.GONE
        step3Container.visibility = View.GONE

        // Show requested step
        when (step) {
            1 -> {
                step1Container.visibility = View.VISIBLE
                tilCompanyStep1.error = null
            }
            2 -> {
                step2Container.visibility = View.VISIBLE
                // Populate company name
                tvCompanyNameStep2.text = "Select your name from ${etCompanyStep1.text}:"
            }
            3 -> {
                step3Container.visibility = View.VISIBLE
                // Show selected contractor name
                tvSelectedContractorName.text = "Contractor: ${selectedContractor?.contractorName ?: "Unknown"}"
                // Clear errors
                tilPhone.error = null
                tilPurpose.error = null
                tilEmail.error = null
            }
        }
    }

    private fun validateAndProceedFromStep1() {
        val companyName = etCompanyStep1.text?.toString()?.trim() ?: ""

        if (companyName.isBlank()) {
            tilCompanyStep1.error = "Please enter your company name"
            return
        }

        tilCompanyStep1.error = null

        // Fetch contractors for this company
        fetchContractorsForCompany(companyName)
    }

    private fun fetchContractorsForCompany(companyName: String) {
        showLoading(true)

        Log.d("ContractorSignIn", "Fetching contractors for company: $companyName")
        Log.d("ContractorSignIn", "Using backend URL: ${RetrofitClient.getBaseUrl()}")

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getContractorsByCompany(companyName)

                showLoading(false)

                Log.d("ContractorSignIn", "Response code: ${response.code()}")
                Log.d("ContractorSignIn", "Response body: ${response.body()}")

                if (response.isSuccessful && response.body() != null) {
                    val contractors = response.body()!!.data

                    Log.d("ContractorSignIn", "Found ${contractors?.size ?: 0} contractors")

                    if (contractors.isNullOrEmpty()) {
                        showFriendlyError("Sorry, we don't have \"$companyName\" on our approved contractors list. Please contact the office for assistance.")
                    } else {
                        // Show contractor selection buttons
                        displayContractorButtons(contractors)
                        showStep(2)
                    }
                } else {
                    // Handle error response
                    val errorBody = response.errorBody()?.string()
                    Log.e("ContractorSignIn", "Error response: $errorBody")

                    if (response.code() == 404) {
                        showFriendlyError("Sorry, we don't have \"$companyName\" on our approved contractors list. Please contact the office for assistance.")
                    } else {
                        showFriendlyError("Unable to verify company. Please try again or contact the office for assistance.\n\nError: ${response.code()}")
                    }
                }
            } catch (e: Exception) {
                showLoading(false)
                Log.e("ContractorSignIn", "Error fetching contractors", e)
                showFriendlyError("Network error. Please check your connection and try again.\n\nError: ${e.message}")
            }
        }
    }

    private fun displayContractorButtons(contractors: List<Contractor>) {
        contractorButtonsContainer.removeAllViews()

        // Calculate button dimensions based on screen width
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val padding = resources.getDimensionPixelSize(R.dimen.contractor_button_margin)

        // Determine number of columns based on screen width
        val minButtonWidth = Constants.MIN_BUTTON_WIDTH_DP // dp
        val minButtonWidthPx = (minButtonWidth * displayMetrics.density).toInt()
        val numColumns = maxOf(2, (screenWidth - padding * 2) / (minButtonWidthPx + padding))

        // Calculate actual button width
        val buttonWidth = (screenWidth - padding * (numColumns + 1)) / numColumns

        for (contractor in contractors) {
            val contractorName = contractor.contractorName ?: "Unnamed Contractor"

            val button = MaterialButton(this).apply {
                text = contractorName
                textSize = 16f
                setTextColor(getColor(R.color.white))
                backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.primary_dark_blue))

                layoutParams = FlexboxLayout.LayoutParams(
                    buttonWidth,
                    resources.getDimensionPixelSize(R.dimen.contractor_button_height)
                ).apply {
                    setMargins(
                        padding / 2,
                        padding / 2,
                        padding / 2,
                        padding / 2
                    )
                }

                // Round corners
                cornerRadius = 12

                setOnClickListener {
                    selectContractor(contractor)
                }
            }

            contractorButtonsContainer.addView(button)
        }
    }

    private fun selectContractor(contractor: Contractor) {
        selectedContractor = contractor
        showStep(3)
    }

    private fun validateAndSubmitStep3() {
        // Clear errors
        tilPhone.error = null
        tilPurpose.error = null
        tilEmail.error = null

        // Get values
        val phone = etPhone.text?.toString()?.trim() ?: ""
        val purpose = etPurpose.text?.toString()?.trim() ?: ""
        val carReg = etCarReg.text?.toString()?.trim()
        val email = etEmail.text?.toString()?.trim()

        var hasErrors = false

        // Validate required fields: phone and purpose
        if (!ValidationUtils.isValidPhone(phone)) {
            tilPhone.error = ValidationUtils.getPhoneError(phone)
            hasErrors = true
        }

        if (purpose.isBlank()) {
            tilPurpose.error = "Purpose of visit is required"
            hasErrors = true
        }

        // Validate optional email if provided
        if (!email.isNullOrBlank() && !ValidationUtils.isValidEmail(email)) {
            tilEmail.error = "Invalid email address"
            hasErrors = true
        }

        if (hasErrors) {
            Toast.makeText(this, "Please fix the errors above", Toast.LENGTH_SHORT).show()
            return
        }

        // Proceed with sign-in
        proceedWithSignIn(phone, purpose, carReg, email)
    }

    private fun proceedWithSignIn(
        phone: String,
        purpose: String,
        carReg: String?,
        email: String?
    ) {
        val contractorName = selectedContractor?.contractorName ?: ""
        val companyName = etCompanyStep1.text?.toString()?.trim() ?: ""

        // Show document signature dialog
        val pdfSignatureDialog = PdfSignatureDialog(this, lifecycleScope, "CCN22a Notice to Contractors Ipswich-1.png")
        pdfSignatureDialog.show(
            onSignatureConfirmed = { signatureBase64 ->
                submitSignInWithSignature(contractorName, companyName, phone, purpose, carReg, email, signatureBase64)
            },
            onCancelled = {
                Toast.makeText(this, "Signature is required to sign in", Toast.LENGTH_SHORT).show()
            }
        )
    }

    private fun submitSignInWithSignature(
        contractorName: String,
        companyName: String,
        phone: String,
        purpose: String,
        carReg: String?,
        email: String?,
        signatureBase64: String
    ) {
        // Create sign-in request
        val request = SignInRequest(
            visitorType = VisitorType.CONTRACTOR,
            fullName = contractorName,
            phoneNumber = phone,
            email = if (email.isNullOrBlank()) null else email,
            companyName = companyName,
            purposeOfVisit = purpose,
            carRegistration = if (carReg.isNullOrBlank()) null else carReg,
            visitingPerson = "", // Will be filled by backend or left blank
            signature = signatureBase64,
            documentAcknowledged = true,
            documentAcknowledgmentTime = getAcknowledgmentTimestamp()
        )

        submitToApi(request)
    }

    private fun submitToApi(request: SignInRequest) {
        showLoading(true)

        lifecycleScope.launch {
            when (val result = repository.createSignIn(request)) {
                is Result.Success -> {
                    showLoading(false)
                    showSuccessDialog(result.data.fullName)
                }
                is Result.Error -> {
                    showLoading(false)
                    handleError(result)
                }
                else -> {}
            }
        }
    }

    private fun handleError(result: Result.Error) {
        val message = when (result.exception) {
            is ValidationException -> {
                val errors = (result.exception as ValidationException).errors
                errors.firstOrNull()?.msg ?: "Validation failed"
            }
            is ApiException -> result.message ?: "API error occurred"
            is NetworkException -> "Network error. Please check your connection."
            else -> result.message ?: "An error occurred"
        }

        AlertDialog.Builder(this)
            .setTitle("Error")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun showSuccessDialog(name: String) {
        AlertDialog.Builder(this)
            .setTitle("Success!")
            .setMessage("$name has been signed in successfully")
            .setPositiveButton("OK") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun showFriendlyError(message: String) {
        AlertDialog.Builder(this)
            .setTitle("Not Found")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .setCancelable(true)
            .show()
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        btnNextStep1.isEnabled = !show
        btnSubmitStep3.isEnabled = !show
    }

    private fun getAcknowledgmentTimestamp(): String {
        return SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            Locale.US
        ).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
    }
}
