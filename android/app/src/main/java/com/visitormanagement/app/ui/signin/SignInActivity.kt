package com.visitormanagement.app.ui.signin

import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.*
import com.visitormanagement.app.data.repository.VisitorRepository
import com.visitormanagement.app.ui.camera.CameraActivity
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.util.ImageUtils
import com.visitormanagement.app.util.ValidationUtils
import kotlinx.coroutines.launch

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
    private lateinit var btnTakePhoto: MaterialButton
    private lateinit var ivPhotoPreview: ImageView

    // Photo data
    private var photoBase64: String? = null

    // Activity result launcher for camera
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val photoData = result.data?.getStringExtra(Constants.EXTRA_PHOTO_DATA)
            if (photoData != null) {
                photoBase64 = photoData
                showPhotoPreview(photoData)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sign_in)

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

        btnTakePhoto.setOnClickListener {
            launchCamera()
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
        btnTakePhoto = findViewById(R.id.btnTakePhoto)
        ivPhotoPreview = findViewById(R.id.ivPhotoPreview)
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

        // Create sign-in request
        val request = SignInRequest(
            visitorType = visitorType,
            fullName = fullName,
            phoneNumber = phone,
            email = if (email.isNullOrBlank()) null else email,
            companyName = if (company.isNullOrBlank()) null else company,
            purposeOfVisit = purpose,
            carRegistration = if (carReg.isNullOrBlank()) null else carReg,
            visitingPerson = visitingPerson,
            photo = photoBase64,
            signature = null // TODO: Implement signature
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

    private fun launchCamera() {
        val intent = Intent(this, CameraActivity::class.java)
        cameraLauncher.launch(intent)
    }

    private fun showPhotoPreview(photoBase64: String) {
        val bitmap: Bitmap? = ImageUtils.base64ToBitmap(photoBase64)
        if (bitmap != null) {
            ivPhotoPreview.setImageBitmap(bitmap)
            ivPhotoPreview.visibility = View.VISIBLE
            btnTakePhoto.text = "✓ Photo Taken - Retake?"
        } else {
            Toast.makeText(this, "Error loading photo", Toast.LENGTH_SHORT).show()
        }
    }
}
