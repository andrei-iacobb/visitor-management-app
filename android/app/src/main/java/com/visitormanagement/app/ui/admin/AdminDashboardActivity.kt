package com.visitormanagement.app.ui.admin

import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import com.visitormanagement.app.R

class AdminDashboardActivity : AppCompatActivity() {

    private lateinit var viewPager: ViewPager2
    private lateinit var tabLayout: TabLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_dashboard)

        // Force landscape orientation and lock screen rotation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE

        initViews()
        setupViewPager()
        setupListeners()
    }

    private fun initViews() {
        viewPager = findViewById(R.id.viewPager)
        tabLayout = findViewById(R.id.tabLayout)
    }

    private fun setupViewPager() {
        val adapter = AdminPagerAdapter(this)
        viewPager.adapter = adapter

        TabLayoutMediator(tabLayout, viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Active Visitors"
                1 -> "All Logs"
                2 -> "SharePoint"
                3 -> "Health Check"
                4 -> "Settings"
                else -> "Tab $position"
            }
        }.attach()
    }

    private fun setupListeners() {
        findViewById<android.view.View>(R.id.btnBack).setOnClickListener {
            finish()
        }

        findViewById<android.view.View>(R.id.btnRefresh).setOnClickListener {
            refreshCurrentFragment()
        }
    }

    private fun refreshCurrentFragment() {
        val currentFragment = supportFragmentManager.findFragmentByTag("f${viewPager.currentItem}")
        if (currentFragment is RefreshableFragment) {
            currentFragment.refresh()
        }
    }

    private inner class AdminPagerAdapter(activity: AppCompatActivity) : FragmentStateAdapter(activity) {
        override fun getItemCount(): Int = 5

        override fun createFragment(position: Int): Fragment {
            return when (position) {
                0 -> ActiveVisitorsFragment()
                1 -> AllLogsFragment()
                2 -> SharePointFragment()
                3 -> HealthCheckFragment()
                4 -> SettingsFragment()
                else -> Fragment()
            }
        }
    }
}

// Interface for refreshable fragments
interface RefreshableFragment {
    fun refresh()
}
