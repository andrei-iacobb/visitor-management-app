package com.visitormanagement.app.ui.document

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.CheckBox
import android.widget.TextView
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.net.URLEncoder

/**
 * Dialog for displaying PDF documents with acknowledgment checkbox
 */
class DocumentAcknowledgmentDialog(
    private val context: Context,
    private val lifecycleScope: kotlinx.coroutines.CoroutineScope,
    private val pdfFileName: String? = null  // Optional - if null, uses default PDF
) {

    private var onAcknowledged: (() -> Unit)? = null
    private var onCancelled: (() -> Unit)? = null

    /**
     * Show the document acknowledgment dialog
     */
    fun show(
        onAcknowledged: () -> Unit = {},
        onCancelled: () -> Unit = {}
    ) {
        this.onAcknowledged = onAcknowledged
        this.onCancelled = onCancelled

        // Load PDF from API
        loadPDF()
    }

    /**
     * Load PDF from API
     */
    private fun loadPDF() {
        lifecycleScope.launch {
            try {
                // Use specific file if provided, otherwise use default
                val response = if (pdfFileName != null) {
                    RetrofitClient.apiService.getPDF(pdfFileName)
                } else {
                    RetrofitClient.apiService.getDefaultPDF()
                }

                if (response.isSuccessful && response.body() != null) {
                    val documentPDF = response.body()!!.data
                    if (documentPDF != null) {
                        displayPDFDialog(documentPDF.pdfBase64, documentPDF.title)
                    } else {
                        Log.e("DocumentDialog", "PDF data is null")
                        displayError()
                    }
                } else {
                    Log.e("DocumentDialog", "Failed to load PDF: ${response.code()}")
                    displayError()
                }
            } catch (e: Exception) {
                Log.e("DocumentDialog", "Error loading PDF", e)
                displayError()
            }
        }
    }

    /**
     * Display the PDF viewer dialog
     */
    private fun displayPDFDialog(pdfBase64: String, title: String) {
        val inflater = LayoutInflater.from(context)
        val view = inflater.inflate(R.layout.dialog_document_acknowledgment, null)

        // Set up views
        val tvTitle = view.findViewById<TextView>(R.id.tvDocumentTitle)
        val webViewPDF = view.findViewById<WebView>(R.id.webViewPDF)
        val cbAcknowledge = view.findViewById<CheckBox>(R.id.cbAcknowledge)
        val btnCancel = view.findViewById<Button>(R.id.btnCancel)
        val btnAgree = view.findViewById<Button>(R.id.btnAgree)

        // Set title
        tvTitle.text = title

        // Display PDF content using WebView
        try {
            val pdfBytes = Base64.decode(pdfBase64, Base64.DEFAULT)
            // Verify PDF was successfully decoded
            if (pdfBytes.isNotEmpty()) {
                Log.d("DocumentDialog", "PDF loaded successfully (${pdfBytes.size} bytes)")

                // Write PDF bytes to files directory
                val pdfDir = File(context.filesDir, "pdfs")
                if (!pdfDir.exists()) {
                    pdfDir.mkdirs()
                }
                val pdfFile = File(pdfDir, "document_${System.currentTimeMillis()}.pdf")
                pdfFile.writeBytes(pdfBytes)
                Log.d("DocumentDialog", "PDF written to: ${pdfFile.absolutePath}")

                // Configure WebView
                webViewPDF.settings.apply {
                    javaScriptEnabled = true
                    builtInZoomControls = true
                    displayZoomControls = false
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    domStorageEnabled = true
                    databaseEnabled = true
                    defaultTextEncodingName = "UTF-8"
                }

                // Create custom WebViewClient to handle any errors
                webViewPDF.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        Log.d("DocumentDialog", "PDF page finished loading: $url")
                    }

                    override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                        super.onReceivedError(view, request, error)
                        Log.e("DocumentDialog", "WebView error: ${error?.description}")
                    }
                }

                // Create HTML wrapper for PDF.js viewer
                val htmlContent = createPdfJsHtml(pdfBase64)
                webViewPDF.loadData(htmlContent, "text/html", "UTF-8")

                Log.d("DocumentDialog", "PDF loaded using PDF.js viewer")
            } else {
                throw Exception("PDF data is empty")
            }
        } catch (e: Exception) {
            Log.e("DocumentDialog", "Error processing PDF", e)
            webViewPDF.loadData(
                "<html><body style='padding:20px; background:#f0f0f0;'>" +
                        "<h3 style='color:#d32f2f;'>Error Loading PDF</h3>" +
                        "<p>Unable to display document. Please contact staff.</p>" +
                        "<p style='font-size:12px; color:#666;'>Error: ${e.message}</p>" +
                        "</body></html>",
                "text/html",
                "utf-8"
            )
        }

        // Set button text
        btnAgree.text = "I Acknowledge"

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

        // Enable Agree button only when checkbox is checked
        cbAcknowledge.setOnCheckedChangeListener { _, isChecked ->
            btnAgree.isEnabled = isChecked
        }

        // Handle Cancel button
        btnCancel.setOnClickListener {
            dialog.dismiss()
            onCancelled?.invoke()
        }

        // Handle Agree button - complete acknowledgment process
        btnAgree.setOnClickListener {
            dialog.dismiss()
            onAcknowledged?.invoke()
        }

        // Show dialog
        dialog.show()
    }

    /**
     * Create HTML content with embedded PDF viewer
     * Uses data URL to embed PDF directly in HTML with embedded iframe
     */
    private fun createPdfJsHtml(pdfBase64: String): String {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 0; overflow: hidden; }
                    #pdf-container { width: 100%; height: 100vh; }
                    iframe { width: 100%; height: 100%; border: none; }
                </style>
            </head>
            <body>
                <div id="pdf-container">
                    <iframe src="data:application/pdf;base64,$pdfBase64" type="application/pdf"></iframe>
                </div>
            </body>
            </html>
        """.trimIndent()
    }

    /**
     * Get current timestamp for acknowledgment
     */
    fun getAcknowledgmentTimestamp(): String {
        return SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            Locale.US
        ).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
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
                loadPDF()
            }
            .create()
            .show()
    }
}
