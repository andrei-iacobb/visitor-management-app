package com.visitormanagement.app.ui.camera

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.visitormanagement.app.R
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.util.ImageUtils
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var imagePreview: ImageView
    private lateinit var btnCapture: FloatingActionButton
    private lateinit var btnRetake: MaterialButton
    private lateinit var btnUsePhoto: MaterialButton
    private lateinit var btnClose: View
    private lateinit var cameraControls: View
    private lateinit var previewControls: View
    private lateinit var faceGuide: View
    private lateinit var tvInstructions: TextView

    private var imageCapture: ImageCapture? = null
    private lateinit var cameraExecutor: ExecutorService
    private var capturedPhotoFile: File? = null
    private var capturedPhotoBase64: String? = null

    companion object {
        private const val TAG = "CameraActivity"
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)

        initViews()
        setupListeners()

        cameraExecutor = Executors.newSingleThreadExecutor()

        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
            )
        }
    }

    private fun initViews() {
        previewView = findViewById(R.id.previewView)
        imagePreview = findViewById(R.id.imagePreview)
        btnCapture = findViewById(R.id.btnCapture)
        btnRetake = findViewById(R.id.btnRetake)
        btnUsePhoto = findViewById(R.id.btnUsePhoto)
        btnClose = findViewById(R.id.btnClose)
        cameraControls = findViewById(R.id.cameraControls)
        previewControls = findViewById(R.id.previewControls)
        faceGuide = findViewById(R.id.faceGuide)
        tvInstructions = findViewById(R.id.tvInstructions)
    }

    private fun setupListeners() {
        btnClose.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }

        btnCapture.setOnClickListener {
            takePhoto()
        }

        btnRetake.setOnClickListener {
            showCameraView()
        }

        btnUsePhoto.setOnClickListener {
            returnPhoto()
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            // Preview
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            // Image capture
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            // Select front camera
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture
                )
            } catch (exc: Exception) {
                Log.e(TAG, "Use case binding failed", exc)
                Toast.makeText(this, "Failed to start camera", Toast.LENGTH_SHORT).show()
            }

        }, ContextCompat.getMainExecutor(this))
    }

    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        // Create output file
        val photoFile = File(
            externalMediaDirs.firstOrNull(),
            SimpleDateFormat("yyyy-MM-dd-HH-mm-ss-SSS", Locale.US)
                .format(System.currentTimeMillis()) + ".jpg"
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed: ${exc.message}", exc)
                    Toast.makeText(
                        this@CameraActivity,
                        "Photo capture failed",
                        Toast.LENGTH_SHORT
                    ).show()
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    capturedPhotoFile = photoFile
                    processAndShowPhoto(photoFile)
                }
            }
        )
    }

    private fun processAndShowPhoto(photoFile: File) {
        try {
            // Read the image
            var bitmap = BitmapFactory.decodeFile(photoFile.absolutePath)

            // Mirror the image since it's from front camera
            val matrix = Matrix().apply {
                postScale(-1f, 1f, bitmap.width / 2f, bitmap.height / 2f)
            }
            bitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)

            // Compress and resize image
            bitmap = ImageUtils.resizeImage(
                bitmap,
                Constants.IMAGE_MAX_WIDTH,
                Constants.IMAGE_MAX_HEIGHT
            )

            // Convert to base64
            capturedPhotoBase64 = ImageUtils.bitmapToBase64(bitmap, Constants.IMAGE_QUALITY)

            // Show preview
            imagePreview.setImageBitmap(bitmap)
            showPreviewView()

        } catch (e: Exception) {
            Log.e(TAG, "Error processing photo", e)
            Toast.makeText(this, "Error processing photo", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showPreviewView() {
        previewView.visibility = View.GONE
        imagePreview.visibility = View.VISIBLE
        cameraControls.visibility = View.GONE
        previewControls.visibility = View.VISIBLE
        faceGuide.visibility = View.GONE
        tvInstructions.visibility = View.GONE
    }

    private fun showCameraView() {
        previewView.visibility = View.VISIBLE
        imagePreview.visibility = View.GONE
        cameraControls.visibility = View.VISIBLE
        previewControls.visibility = View.GONE
        faceGuide.visibility = View.VISIBLE
        tvInstructions.visibility = View.VISIBLE
        capturedPhotoBase64 = null
        capturedPhotoFile = null
    }

    private fun returnPhoto() {
        if (capturedPhotoBase64 != null) {
            val resultIntent = Intent().apply {
                putExtra(Constants.EXTRA_PHOTO_DATA, capturedPhotoBase64)
            }
            setResult(RESULT_OK, resultIntent)
            finish()
        } else {
            Toast.makeText(this, "No photo captured", Toast.LENGTH_SHORT).show()
        }
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
            } else {
                Toast.makeText(
                    this,
                    "Camera permission is required to take photos",
                    Toast.LENGTH_SHORT
                ).show()
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()

        // Clean up temporary photo file
        capturedPhotoFile?.delete()
    }
}
