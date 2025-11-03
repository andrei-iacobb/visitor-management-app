package com.visitormanagement.app.ui.signature

import android.app.AlertDialog
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.widget.Button
import android.widget.ImageView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import kotlinx.coroutines.launch
import okhttp3.ResponseBody
import java.io.ByteArrayOutputStream

/**
 * Dialog for displaying document images and capturing user signatures
 */
class PdfSignatureDialog(
    private val context: Context,
    private val lifecycleScope: kotlinx.coroutines.CoroutineScope,
    private val imageFileName: String = "document.png"
) {

    private var onSignatureConfirmed: ((signatureBase64: String) -> Unit)? = null
    private var onCancelled: (() -> Unit)? = null

    /**
     * Show the signature dialog with document image
     */
    fun show(
        onSignatureConfirmed: (signatureBase64: String) -> Unit = {},
        onCancelled: () -> Unit = {}
    ) {
        this.onSignatureConfirmed = onSignatureConfirmed
        this.onCancelled = onCancelled

        loadAndDisplayImage()
    }

    /**
     * Load image from API
     */
    private fun loadAndDisplayImage() {
        lifecycleScope.launch {
            try {
                // Fetch image from API by filename
                val response = RetrofitClient.apiService.getDocument(imageFileName)

                if (response.isSuccessful && response.body() != null) {
                    val imageBytes = response.body()!!.bytes()
                    val imageBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

                    if (imageBitmap != null) {
                        Log.d("SignatureDialog", "Image loaded successfully (${imageBytes.size} bytes)")
                        displaySignatureDialog(imageBitmap)
                    } else {
                        Log.e("SignatureDialog", "Failed to decode image bitmap")
                        displayError()
                    }
                } else {
                    Log.e("SignatureDialog", "Failed to load image: ${response.code()}")
                    displayError()
                }
            } catch (e: Exception) {
                Log.e("SignatureDialog", "Error loading image", e)
                displayError()
            }
        }
    }

    /**
     * Display the document image and signature dialog
     */
    private fun displaySignatureDialog(imageBitmap: Bitmap) {
        val inflater = LayoutInflater.from(context)
        val view = inflater.inflate(R.layout.dialog_pdf_signature, null)

        // Get references to views
        val ivPdfPage = view.findViewById<ImageView>(R.id.ivPdfPage)
        val signaturePad = view.findViewById<CustomSignaturePad>(R.id.signaturePad)
        val btnClearSignature = view.findViewById<Button>(R.id.btnClearSignature)
        val btnCancel = view.findViewById<Button>(R.id.btnCancel)
        val btnConfirm = view.findViewById<Button>(R.id.btnConfirm)

        // Display the document image
        ivPdfPage.setImageBitmap(imageBitmap)

        // Create dialog
        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .setCancelable(false)
            .create()

        // Set dialog window attributes for full screen (landscape)
        dialog.window?.setLayout(
            (context.resources.displayMetrics.widthPixels * 0.95).toInt(),
            (context.resources.displayMetrics.heightPixels * 0.95).toInt()
        )

        // Clear signature button
        btnClearSignature.setOnClickListener {
            signaturePad.clear()
        }

        // Enable confirm button only when signature is present
        signaturePad.setOnTouchListener { _, _ ->
            if (signaturePad.hasSignature()) {
                btnConfirm.isEnabled = true
            }
            false
        }

        // Cancel button
        btnCancel.setOnClickListener {
            dialog.dismiss()
            onCancelled?.invoke()
        }

        // Confirm button - capture signature and proceed
        btnConfirm.setOnClickListener {
            val signatureBitmap = signaturePad.getSignatureBitmap()
            if (signatureBitmap != null) {
                val signatureBase64 = bitmapToBase64(signatureBitmap)
                dialog.dismiss()
                onSignatureConfirmed?.invoke(signatureBase64)
            } else {
                Toast.makeText(context, "Failed to capture signature", Toast.LENGTH_SHORT).show()
            }
        }

        // Show dialog
        dialog.show()
    }


    /**
     * Convert bitmap to base64 string
     */
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }

    /**
     * Display error dialog
     */
    private fun displayError() {
        AlertDialog.Builder(context)
            .setTitle("Error Loading Document")
            .setMessage("Failed to load the document. Please try again.")
            .setPositiveButton("Cancel") { dialog, _ ->
                dialog.dismiss()
                onCancelled?.invoke()
            }
            .setNegativeButton("Retry") { dialog, _ ->
                dialog.dismiss()
                loadAndDisplayImage()
            }
            .create()
            .show()
    }
}
