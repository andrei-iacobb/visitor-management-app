package com.visitormanagement.app.ui.main

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.VisitorType
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.ui.signin.SignInActivity
import com.visitormanagement.app.ui.signin.ContractorSignInActivity
import com.visitormanagement.app.ui.signout.SignOutActivity
import com.visitormanagement.app.ui.admin.AdminDashboardActivity
import com.visitormanagement.app.ui.vehicle.VehicleCheckoutActivity
import com.google.android.material.card.MaterialCardView
import com.google.android.material.button.MaterialButton
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.Timer
import java.util.TimerTask

class MainActivity : AppCompatActivity() {

    private lateinit var tvClock: TextView
    private lateinit var tvDate: TextView
    private var clockTimer: Timer? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Force landscape orientation and lock screen rotation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        // Initialize clock views
        tvClock = findViewById(R.id.tvClock)
        tvDate = findViewById(R.id.tvDate)

        setupClickListeners()
        startClockUpdates()
        updateClockDisplay()
    }

    private fun setupClickListeners() {
        // Visitor sign-in
        findViewById<MaterialCardView>(R.id.cardVisitor).setOnClickListener {
            startSignIn(VisitorType.VISITOR)
        }

        // Contractor sign-in
        findViewById<MaterialCardView>(R.id.cardContractor).setOnClickListener {
            startSignIn(VisitorType.CONTRACTOR)
        }

        // Keys - Vehicle checkout/checkin
        findViewById<MaterialCardView>(R.id.cardKeys).setOnClickListener {
            startActivity(Intent(this, VehicleCheckoutActivity::class.java))
        }

        // Sign out visitors
        findViewById<MaterialCardView>(R.id.cardSignOut).setOnClickListener {
            startActivity(Intent(this, SignOutActivity::class.java))
        }

        // Admin dashboard
        findViewById<MaterialButton>(R.id.btnAdmin).setOnClickListener {
            startActivity(Intent(this, AdminDashboardActivity::class.java))
        }
    }

    private fun startSignIn(visitorType: String) {
        // Use ContractorSignInActivity for contractors, SignInActivity for visitors
        val activityClass = if (visitorType == VisitorType.CONTRACTOR) {
            ContractorSignInActivity::class.java
        } else {
            SignInActivity::class.java
        }

        val intent = Intent(this, activityClass).apply {
            putExtra(Constants.EXTRA_VISITOR_TYPE, visitorType)
        }
        startActivity(intent)
    }

    private fun startClockUpdates() {
        clockTimer = Timer()
        clockTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                handler.post {
                    updateClockDisplay()
                }
            }
        }, 0, 1000) // Update every second
    }

    private fun updateClockDisplay() {
        val now = Date()

        // Format time (12-hour format)
        val timeFormat = SimpleDateFormat("h:mm a", Locale.US)
        tvClock.text = timeFormat.format(now)

        // Format date
        val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.US)
        tvDate.text = dateFormat.format(now)
    }

    override fun onDestroy() {
        super.onDestroy()
        // Stop clock updates when activity is destroyed
        clockTimer?.cancel()
        clockTimer = null
    }
}
