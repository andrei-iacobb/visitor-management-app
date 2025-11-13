package com.visitormanagement.app.ui.admin

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.snackbar.Snackbar
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.util.Constants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HealthCheckFragment : Fragment() {

    private lateinit var tvBackendUrl: TextView
    private lateinit var tvStatus: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnTest: MaterialButton
    private lateinit var cardResult: MaterialCardView
    private lateinit var tvResponse: TextView
    private lateinit var tvResponseTime: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_health_check, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        loadBackendUrl()
        setupListeners()
    }

    private fun initViews(view: View) {
        tvBackendUrl = view.findViewById(R.id.tvBackendUrl)
        tvStatus = view.findViewById(R.id.tvStatus)
        progressBar = view.findViewById(R.id.progressBar)
        btnTest = view.findViewById(R.id.btnTestHealth)
        cardResult = view.findViewById(R.id.cardResult)
        tvResponse = view.findViewById(R.id.tvResponse)
        tvResponseTime = view.findViewById(R.id.tvResponseTime)
    }

    private fun loadBackendUrl() {
        val sharedPref = requireContext().getSharedPreferences(
            Constants.PREF_NAME,
            Context.MODE_PRIVATE
        )
        val url = sharedPref.getString(Constants.PREF_API_BASE_URL, Constants.BASE_URL)
        tvBackendUrl.text = url
        tvStatus.text = "Ready to test"
        cardResult.visibility = View.GONE
    }

    private fun setupListeners() {
        btnTest.setOnClickListener {
            testHealthCheck()
        }
    }

    private fun testHealthCheck() {
        btnTest.isEnabled = false
        progressBar.visibility = View.VISIBLE
        tvStatus.text = "Testing connection..."
        cardResult.visibility = View.GONE

        CoroutineScope(Dispatchers.Main).launch {
            val result = performHealthCheck()
            progressBar.visibility = View.GONE
            btnTest.isEnabled = true

            if (result.success) {
                showSuccessResult(result)
            } else {
                showErrorResult(result)
            }
        }
    }

    private suspend fun performHealthCheck(): HealthCheckResult {
        return withContext(Dispatchers.IO) {
            val startTime = System.currentTimeMillis()

            try {
                val response = RetrofitClient.apiService.healthCheck()
                val endTime = System.currentTimeMillis()
                val responseTime = endTime - startTime

                if (response.isSuccessful) {
                    val body = response.body()
                    HealthCheckResult(
                        success = true,
                        message = body?.message ?: "Backend is operational",
                        responseTime = responseTime,
                        statusCode = response.code(),
                        fullResponse = buildResponseSummary(body)
                    )
                } else {
                    HealthCheckResult(
                        success = false,
                        message = "Server returned status ${response.code()}",
                        responseTime = System.currentTimeMillis() - startTime,
                        statusCode = response.code(),
                        error = response.errorBody()?.string() ?: "Unknown error"
                    )
                }
            } catch (e: Exception) {
                HealthCheckResult(
                    success = false,
                    message = "Connection failed: ${e.message}",
                    responseTime = System.currentTimeMillis() - startTime,
                    error = "Exception: ${e.localizedMessage}\n\n${e.cause?.localizedMessage ?: "No additional details"}"
                )
            }
        }
    }

    private fun showSuccessResult(result: HealthCheckResult) {
        tvStatus.text = "✅ Backend is reachable!"
        cardResult.visibility = View.VISIBLE
        cardResult.setCardBackgroundColor(requireContext().getColor(R.color.success_green))

        tvResponse.text = buildString {
            append("✅ Connection Successful\n\n")
            append("Status Code: ${result.statusCode}\n")
            append("Response Time: ${result.responseTime}ms\n")
            append("Message: ${result.message}\n\n")
            append("Response:\n${result.fullResponse}")
        }

        tvResponseTime.text = "${result.responseTime}ms"

        showSnackbar("Backend is working perfectly!", true)
    }

    private fun showErrorResult(result: HealthCheckResult) {
        tvStatus.text = "❌ Connection failed"
        cardResult.visibility = View.VISIBLE
        cardResult.setCardBackgroundColor(requireContext().getColor(R.color.error_red))

        tvResponse.text = buildString {
            append("❌ Connection Failed\n\n")
            append("Error: ${result.message}\n")
            append("Response Time: ${result.responseTime}ms\n\n")
            if (!result.error.isNullOrEmpty()) {
                append("Details:\n${result.error}")
            }
        }

        tvResponseTime.text = "${result.responseTime}ms"

        showSnackbar("Backend is not reachable. Check URL and network connection.", false)
    }

    private fun showSnackbar(message: String, isSuccess: Boolean) {
        view?.let {
            Snackbar.make(it, message, Snackbar.LENGTH_LONG)
                .setBackgroundTint(
                    if (isSuccess) requireContext().getColor(R.color.success_green)
                    else requireContext().getColor(R.color.error_red)
                )
                .show()
        }
    }

    private fun buildResponseSummary(data: Any?): String {
        return if (data != null) {
            data.toString()
        } else {
            "Endpoint responded successfully"
        }
    }

    data class HealthCheckResult(
        val success: Boolean,
        val message: String,
        val responseTime: Long,
        val statusCode: Int = 0,
        val fullResponse: String = "",
        val error: String? = null
    )
}
