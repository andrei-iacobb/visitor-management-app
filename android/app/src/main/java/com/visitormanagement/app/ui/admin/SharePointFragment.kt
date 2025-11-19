package com.visitormanagement.app.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.data.model.Result
import com.visitormanagement.app.data.repository.VisitorRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SharePointFragment : Fragment(), RefreshableFragment {

    private lateinit var repository: VisitorRepository

    private lateinit var btnSyncNow: MaterialButton
    private lateinit var btnSyncUnsyncedOnly: MaterialButton
    private lateinit var btnReadFromSharePoint: MaterialButton
    private lateinit var tvStatus: TextView
    private lateinit var tvLastSync: TextView
    private lateinit var tvTotalRecords: TextView
    private lateinit var tvSyncedRecords: TextView
    private lateinit var tvUnsyncedRecords: TextView
    private lateinit var statusIndicator: View
    private lateinit var progressBar: View

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_sharepoint, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        repository = VisitorRepository()
        initViews(view)
        setupListeners()
        loadStatistics()
    }

    private fun initViews(view: View) {
        btnSyncNow = view.findViewById(R.id.btnSyncNow)
        btnSyncUnsyncedOnly = view.findViewById(R.id.btnSyncUnsyncedOnly)
        btnReadFromSharePoint = view.findViewById(R.id.btnReadFromSharePoint)
        tvStatus = view.findViewById(R.id.tvStatus)
        tvLastSync = view.findViewById(R.id.tvLastSync)
        tvTotalRecords = view.findViewById(R.id.tvTotalRecords)
        tvSyncedRecords = view.findViewById(R.id.tvSyncedRecords)
        tvUnsyncedRecords = view.findViewById(R.id.tvUnsyncedRecords)
        statusIndicator = view.findViewById(R.id.statusIndicator)
        progressBar = view.findViewById(R.id.progressBar)

        // Set initial status
        tvStatus.text = "Not configured"
        tvLastSync.text = "Last sync: Never"
    }

    private fun setupListeners() {
        btnSyncNow.setOnClickListener {
            syncToSharePoint()
        }

        btnSyncUnsyncedOnly.setOnClickListener {
            Toast.makeText(
                context,
                "Syncing unsynced records only...",
                Toast.LENGTH_SHORT
            ).show()
            syncToSharePoint()
        }

        btnReadFromSharePoint.setOnClickListener {
            readFromSharePoint()
        }
    }

    override fun refresh() {
        loadStatistics()
    }

    private fun loadStatistics() {
        lifecycleScope.launch {
            when (val result = repository.getSignIns(limit = Constants.SHAREPOINT_SYNC_LIMIT)) {
                is Result.Success -> {
                    val total = result.data.size
                    // Note: We don't have sharepoint_synced in the response model yet
                    // For now, showing placeholder data
                    tvTotalRecords.text = total.toString()
                    tvSyncedRecords.text = "0"
                    tvUnsyncedRecords.text = total.toString()
                }
                is Result.Error -> {
                    tvTotalRecords.text = "?"
                    tvSyncedRecords.text = "?"
                    tvUnsyncedRecords.text = "?"
                }
                else -> {}
            }
        }
    }

    private fun syncToSharePoint() {
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.syncToSharePoint()
                showLoading(false)

                if (response.isSuccessful && response.body()?.success == true) {
                    tvStatus.text = "Sync successful"
                    tvLastSync.text = "Last sync: ${getCurrentTime()}"
                    statusIndicator.setBackgroundResource(android.R.drawable.presence_online)

                    Toast.makeText(
                        context,
                        "Successfully synced to SharePoint!",
                        Toast.LENGTH_SHORT
                    ).show()

                    loadStatistics()
                } else {
                    val errorMsg = response.body()?.message
                        ?: response.body()?.error
                        ?: "Sync failed"
                    tvStatus.text = "Sync failed"
                    statusIndicator.setBackgroundResource(android.R.drawable.presence_busy)

                    Toast.makeText(
                        context,
                        "Error: $errorMsg",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                showLoading(false)
                tvStatus.text = "Connection error"
                statusIndicator.setBackgroundResource(android.R.drawable.presence_offline)

                Toast.makeText(
                    context,
                    "Error: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun readFromSharePoint() {
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.readFromSharePoint()
                showLoading(false)

                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(
                        context,
                        "Successfully read from SharePoint!",
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    val errorMsg = response.body()?.message
                        ?: response.body()?.error
                        ?: "Read failed"

                    Toast.makeText(
                        context,
                        "Error: $errorMsg",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                showLoading(false)

                Toast.makeText(
                    context,
                    "Error: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun getCurrentTime(): String {
        return SimpleDateFormat("MMM dd, yyyy h:mm a", Locale.getDefault()).format(Date())
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        btnSyncNow.isEnabled = !show
        btnSyncUnsyncedOnly.isEnabled = !show
        btnReadFromSharePoint.isEnabled = !show
    }
}
