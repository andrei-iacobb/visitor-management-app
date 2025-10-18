package com.visitormanagement.app.ui.main

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.VisitorType
import com.visitormanagement.app.util.Constants
import com.visitormanagement.app.ui.signin.SignInActivity
import com.visitormanagement.app.ui.signout.SignOutActivity
import com.visitormanagement.app.ui.admin.AdminDashboardActivity
import com.google.android.material.card.MaterialCardView
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupClickListeners()
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

        // Sign out visitors
        findViewById<MaterialCardView>(R.id.cardActive).setOnClickListener {
            startActivity(Intent(this, SignOutActivity::class.java))
        }

        // Admin dashboard
        findViewById<FloatingActionButton>(R.id.fabAdmin).setOnClickListener {
            startActivity(Intent(this, AdminDashboardActivity::class.java))
        }
    }

    private fun startSignIn(visitorType: String) {
        val intent = Intent(this, SignInActivity::class.java).apply {
            putExtra(Constants.EXTRA_VISITOR_TYPE, visitorType)
        }
        startActivity(intent)
    }
}
