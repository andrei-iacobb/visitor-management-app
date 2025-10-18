package com.visitormanagement.app.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Utility class for image processing and conversion
 */
object ImageUtils {

    /**
     * Convert bitmap to Base64 string with data URI prefix
     */
    fun bitmapToBase64(bitmap: Bitmap, quality: Int = Constants.IMAGE_QUALITY): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        val bytes = outputStream.toByteArray()
        val base64String = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return "data:image/jpeg;base64,$base64String"
    }

    /**
     * Convert Base64 string to bitmap
     */
    fun base64ToBitmap(base64String: String): Bitmap? {
        return try {
            // Remove data URI prefix if present
            val base64Image = base64String.substringAfter("base64,")
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Resize bitmap to fit within max dimensions
     */
    fun resizeImage(
        bitmap: Bitmap,
        maxWidth: Int = Constants.IMAGE_MAX_WIDTH,
        maxHeight: Int = Constants.IMAGE_MAX_HEIGHT
    ): Bitmap {
        // Calculate scale factor
        val scale = minOf(
            maxWidth.toFloat() / bitmap.width,
            maxHeight.toFloat() / bitmap.height,
            1.0f // Don't upscale
        )

        if (scale >= 1.0f) {
            return bitmap
        }

        val newWidth = (bitmap.width * scale).toInt()
        val newHeight = (bitmap.height * scale).toInt()

        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    /**
     * Compress and resize bitmap to meet size requirements
     */
    fun compressBitmap(
        bitmap: Bitmap,
        maxWidth: Int = Constants.IMAGE_MAX_WIDTH,
        maxHeight: Int = Constants.IMAGE_MAX_HEIGHT,
        quality: Int = Constants.IMAGE_QUALITY
    ): Bitmap {
        return resizeImage(bitmap, maxWidth, maxHeight)
    }

    /**
     * Rotate bitmap by specified degrees
     */
    fun rotateBitmap(bitmap: Bitmap, degrees: Float): Bitmap {
        val matrix = Matrix().apply {
            postRotate(degrees)
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    /**
     * Get file size in bytes from Base64 string
     */
    fun getBase64Size(base64String: String): Int {
        val base64Image = base64String.substringAfter("base64,")
        return (base64Image.length * 3) / 4 // Approximate size
    }

    /**
     * Check if Base64 string exceeds maximum size
     */
    fun exceedsMaxSize(base64String: String, maxSizeBytes: Int = Constants.MAX_IMAGE_SIZE_BYTES): Boolean {
        return getBase64Size(base64String) > maxSizeBytes
    }

    /**
     * Compress bitmap iteratively until it meets size requirements
     */
    fun compressToMaxSize(
        bitmap: Bitmap,
        maxSizeBytes: Int = Constants.MAX_IMAGE_SIZE_BYTES
    ): String {
        var quality = Constants.IMAGE_QUALITY
        var compressed = bitmap

        while (quality > 10) {
            val base64 = bitmapToBase64(compressed, quality)
            if (!exceedsMaxSize(base64, maxSizeBytes)) {
                return base64
            }

            // Reduce quality
            quality -= 10

            // If quality is too low, reduce dimensions
            if (quality <= 10 && exceedsMaxSize(base64, maxSizeBytes)) {
                compressed = compressBitmap(
                    bitmap,
                    bitmap.width / 2,
                    bitmap.height / 2,
                    50
                )
            }
        }

        return bitmapToBase64(compressed, 10)
    }

    /**
     * Create empty signature bitmap with white background
     */
    fun createSignatureBitmap(width: Int, height: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(android.graphics.Color.WHITE)
        return bitmap
    }

    /**
     * Check if bitmap is effectively empty (mostly white/transparent)
     */
    fun isBitmapEmpty(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        var nonWhiteCount = 0
        val threshold = (bitmap.width * bitmap.height * 0.01).toInt() // 1% threshold

        for (pixel in pixels) {
            val alpha = (pixel shr 24) and 0xFF
            val red = (pixel shr 16) and 0xFF
            val green = (pixel shr 8) and 0xFF
            val blue = pixel and 0xFF

            // Check if pixel is not white or transparent
            if (alpha > 10 && (red < 250 || green < 250 || blue < 250)) {
                nonWhiteCount++
                if (nonWhiteCount > threshold) {
                    return false
                }
            }
        }

        return true
    }

    /**
     * Compress file to bitmap
     */
    fun compressFile(file: File): Bitmap? {
        return try {
            val bitmap = BitmapFactory.decodeFile(file.absolutePath)
            compressBitmap(bitmap)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
