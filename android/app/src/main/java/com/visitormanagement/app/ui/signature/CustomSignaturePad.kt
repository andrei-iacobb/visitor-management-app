package com.visitormanagement.app.ui.signature

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

/**
 * Custom view for capturing user signatures via finger drawing
 */
class CustomSignaturePad @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var bitmap: Bitmap? = null
    private var canvas: Canvas? = null
    private val paint = Paint().apply {
        color = Color.BLACK
        isAntiAlias = true
        isDither = true
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        strokeWidth = 4f
        style = Paint.Style.STROKE
    }
    private val backgroundPaint = Paint().apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }

    private var lastX = 0f
    private var lastY = 0f

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w > 0 && h > 0) {
            bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            canvas = Canvas(bitmap!!)
            // Fill with white background
            canvas!!.drawRect(0f, 0f, w.toFloat(), h.toFloat(), backgroundPaint)
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (bitmap != null) {
            canvas.drawBitmap(bitmap!!, 0f, 0f, null)
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                lastX = x
                lastY = y
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                if (canvas != null) {
                    canvas!!.drawLine(lastX, lastY, x, y, paint)
                    invalidate()
                }
                lastX = x
                lastY = y
                return true
            }
            MotionEvent.ACTION_UP -> {
                if (canvas != null) {
                    canvas!!.drawLine(lastX, lastY, x, y, paint)
                    invalidate()
                }
                lastX = 0f
                lastY = 0f
                return true
            }
        }
        return false
    }

    /**
     * Clear the signature canvas
     */
    fun clear() {
        if (canvas != null && bitmap != null) {
            canvas!!.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)
            invalidate()
        }
    }

    /**
     * Get the signature as a bitmap
     */
    fun getSignatureBitmap(): Bitmap? {
        return bitmap?.copy(bitmap!!.config, false)
    }

    /**
     * Check if the signature pad has any content
     */
    fun hasSignature(): Boolean {
        if (bitmap == null) return false

        // Check if any pixel is not white
        val width = bitmap!!.width
        val height = bitmap!!.height
        val pixels = IntArray(width * height)
        bitmap!!.getPixels(pixels, 0, width, 0, 0, width, height)

        return pixels.any { it != Color.WHITE }
    }
}
