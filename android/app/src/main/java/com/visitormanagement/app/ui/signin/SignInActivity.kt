package com.visitormanagement.app.ui.signin

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
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

class SignInActivity : AppCompatActivity() {

    private lateinit var repository: VisitorRepository
    private lateinit var visitorType: String

    // Views
    private lateinit var tilFullName: TextInputLayout
    private lateinit var tilPhone: TextInputLayout
    private lateinit var tilEmail: TextInputLayout
    private lateinit var tilCompany: TextInputLayout
    private lateinit var tilPurpose: TextInputLayout
    private lateinit var tilVisitingPerson: TextInputLayout
    private lateinit var tilCarReg: TextInputLayout

    private lateinit var etFullName: TextInputEditText
    private lateinit var etPhone: TextInputEditText
    private lateinit var etEmail: TextInputEditText
    private lateinit var etCompany: TextInputEditText
    private lateinit var etPurpose: TextInputEditText
    private lateinit var etVisitingPerson: TextInputEditText
    private lateinit var etCarReg: TextInputEditText

    private lateinit var progressBar: View
    private lateinit var btnSubmit: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sign_in)

        // Force landscape orientation and lock screen rotation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        // Get visitor type from intent
        visitorType = intent.getStringExtra(Constants.EXTRA_VISITOR_TYPE) ?: VisitorType.VISITOR

        // Initialize repository
        repository = VisitorRepository()

        // Initialize views
        initViews()

        // Set title based on visitor type
        val titleView = findViewById<android.widget.TextView>(R.id.tvTitle)
        titleView.text = if (visitorType == VisitorType.VISITOR) {
            "Visitor Sign-In"
        } else {
            "Contractor Sign-In"
        }

        // Setup listeners
        findViewById<View>(R.id.btnBack).setOnClickListener {
            finish()
        }

        btnSubmit.setOnClickListener {
            submitSignIn()
        }
    }

    private fun initViews() {
        tilFullName = findViewById(R.id.tilFullName)
        tilPhone = findViewById(R.id.tilPhone)
        tilEmail = findViewById(R.id.tilEmail)
        tilCompany = findViewById(R.id.tilCompany)
        tilPurpose = findViewById(R.id.tilPurpose)
        tilVisitingPerson = findViewById(R.id.tilVisitingPerson)
        tilCarReg = findViewById(R.id.tilCarReg)

        etFullName = findViewById(R.id.etFullName)
        etPhone = findViewById(R.id.etPhone)
        etEmail = findViewById(R.id.etEmail)
        etCompany = findViewById(R.id.etCompany)
        etPurpose = findViewById(R.id.etPurpose)
        etVisitingPerson = findViewById(R.id.etVisitingPerson)
        etCarReg = findViewById(R.id.etCarReg)

        progressBar = findViewById(R.id.progressBar)
        btnSubmit = findViewById(R.id.btnSubmit)
    }

    private fun submitSignIn() {
        // Clear previous errors
        clearErrors()

        // Get values
        val fullName = etFullName.text?.toString()?.trim() ?: ""
        val phone = etPhone.text?.toString()?.trim() ?: ""
        val email = etEmail.text?.toString()?.trim()
        val company = etCompany.text?.toString()?.trim()
        val purpose = etPurpose.text?.toString()?.trim() ?: ""
        val visitingPerson = etVisitingPerson.text?.toString()?.trim() ?: ""
        val carReg = etCarReg.text?.toString()?.trim()

        // Validate
        var hasErrors = false

        if (!ValidationUtils.isValidName(fullName)) {
            tilFullName.error = ValidationUtils.getNameError(fullName)
            hasErrors = true
        }

        if (!ValidationUtils.isValidPhone(phone)) {
            tilPhone.error = ValidationUtils.getPhoneError(phone)
            hasErrors = true
        }

        if (!email.isNullOrBlank() && !ValidationUtils.isValidEmail(email)) {
            tilEmail.error = "Invalid email address"
            hasErrors = true
        }

        if (purpose.isBlank()) {
            tilPurpose.error = "Purpose of visit is required"
            hasErrors = true
        }

        if (visitingPerson.isBlank()) {
            tilVisitingPerson.error = "Person visiting is required"
            hasErrors = true
        }

        if (hasErrors) {
            Toast.makeText(this, "Please fix the errors above", Toast.LENGTH_SHORT).show()
            return
        }

        // If contractor, verify they're approved before proceeding
        if (visitorType == VisitorType.CONTRACTOR) {
            verifyContractorApproval(fullName, company)
        } else {
            // Visitor - proceed with sign-in
            proceedWithSignIn(fullName, phone, email, company, purpose, visitingPerson, carReg)
        }
    }

    /**
     * Verify if contractor is approved before allowing sign-in
     */
    private fun verifyContractorApproval(contractorName: String, companyName: String?) {
        showLoading(true)

        lifecycleScope.launch {
            try {
                val verificationRequest = ContractorVerificationRequest(
                    companyName = companyName ?: "",
                    contractorName = contractorName
                )

                val response = RetrofitClient.apiService.verifyContractor(verificationRequest)

                showLoading(false)

                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!

                    if (body.allowed) {
                        // Contractor is approved - proceed with sign-in
                        val fullName = etFullName.text?.toString()?.trim() ?: ""
                        val phone = etPhone.text?.toString()?.trim() ?: ""
                        val email = etEmail.text?.toString()?.trim()
                        val company = etCompany.text?.toString()?.trim()
                        val purpose = etPurpose.text?.toString()?.trim() ?: ""
                        val visitingPerson = etVisitingPerson.text?.toString()?.trim() ?: ""
                        val carReg = etCarReg.text?.toString()?.trim()

                        proceedWithSignIn(fullName, phone, email, company, purpose, visitingPerson, carReg)
                    } else {
                        // Contractor is NOT approved - show rejection dialog
                        showContractorRejectionDialog(body.message, body.reason)
                    }
                } else {
                    // Handle API error
                    val errorMessage = response.errorBody()?.string() ?: "Failed to verify contractor"
                    handleContractorVerificationError(errorMessage)
                }
            } catch (e: Exception) {
                showLoading(false)
                Log.e("SignInActivity", "Error verifying contractor", e)
                Toast.makeText(this@SignInActivity, "Error verifying contractor: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Proceed with the actual sign-in after validation
     */
    private fun proceedWithSignIn(
        fullName: String,
        phone: String,
        email: String?,
        company: String?,
        purpose: String,
        visitingPerson: String,
        carReg: String?
    ) {
        // Show document signature dialog
        val pdfSignatureDialog = PdfSignatureDialog(this, lifecycleScope, "CCN22a Notice to Contractors Ipswich-1.png")
        pdfSignatureDialog.show(
            onSignatureConfirmed = { signatureBase64 ->
                // Signature captured - proceed with sign-in
                submitSignInWithSignature(
                    fullName, phone, email, company, purpose, visitingPerson, carReg,
                    signatureBase64
                )
            },
            onCancelled = {
                // User cancelled - stay on form
                Toast.makeText(this, "Signature is required to sign in", Toast.LENGTH_SHORT).show()
            }
        )
    }

    /**
     * Submit sign-in with signature
     */
    private fun submitSignInWithSignature(
        fullName: String,
        phone: String,
        email: String?,
        company: String?,
        purpose: String,
        visitingPerson: String,
        carReg: String?,
        signatureBase64: String
    ) {
        // Create sign-in request with signature
        val request = SignInRequest(
            visitorType = visitorType,
            fullName = fullName,
            phoneNumber = phone,
            email = if (email.isNullOrBlank()) null else email,
            companyName = if (company.isNullOrBlank()) null else company,
            purposeOfVisit = purpose,
            carRegistration = if (carReg.isNullOrBlank()) null else carReg,
            visitingPerson = visitingPerson,
            photo = null,
            signature = signatureBase64,
            documentAcknowledged = true,
            documentAcknowledgmentTime = getAcknowledgmentTimestamp()
        )

        // Submit to API
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
                // Show first validation error
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
                finish() // Go back to main screen
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Show rejection dialog when contractor is not approved
     */
    private fun showContractorRejectionDialog(message: String, reason: String?) {
        val titleText = "Access Denied"
        val detailedMessage = when (reason) {
            "NOT_ON_APPROVED_LIST" -> {
                "$message\n\nPlease contact your supervisor or administration to be added to the approved contractors list."
            }
            "PENDING_APPROVAL" -> {
                "$message\n\nYour company is currently pending approval. Please check back later or contact administration."
            }
            "APPROVAL_EXPIRED" -> {
                "$message\n\nPlease contact administration to renew your approval."
            }
            else -> {
                "$message\n\nPlease contact administration for more information."
            }
        }

        AlertDialog.Builder(this)
            .setTitle(titleText)
            .setMessage(detailedMessage)
            .setPositiveButton("OK") { _, _ ->
                // Do nothing - stay on sign-in screen
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Handle contractor verification errors
     */
    private fun handleContractorVerificationError(errorMessage: String) {
        AlertDialog.Builder(this)
            .setTitle("Verification Error")
            .setMessage("Unable to verify contractor status. Please try again.\n\nError: $errorMessage")
            .setPositiveButton("OK") { _, _ ->
                // User can retry
            }
            .show()
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        btnSubmit.isEnabled = !show
    }

    private fun clearErrors() {
        tilFullName.error = null
        tilPhone.error = null
        tilEmail.error = null
        tilPurpose.error = null
        tilVisitingPerson.error = null
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
