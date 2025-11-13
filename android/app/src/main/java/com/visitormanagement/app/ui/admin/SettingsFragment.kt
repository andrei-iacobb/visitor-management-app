package com.visitormanagement.app.ui.admin

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import com.visitormanagement.app.R
import com.visitormanagement.app.data.api.RetrofitClient
import com.visitormanagement.app.util.Constants

class SettingsFragment : Fragment() {

    private lateinit var etBackendUrl: EditText
    private lateinit var tvCurrentUrl: TextView
    private lateinit var btnSave: MaterialButton
    private lateinit var btnReset: MaterialButton

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_settings, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        loadCurrentUrl()
        setupListeners()
    }

    private fun initViews(view: View) {
        etBackendUrl = view.findViewById(R.id.etBackendUrl)
        tvCurrentUrl = view.findViewById(R.id.tvCurrentUrl)
        btnSave = view.findViewById(R.id.btnSave)
        btnReset = view.findViewById(R.id.btnReset)
    }

    private fun loadCurrentUrl() {
        // Get the actual current URL from RetrofitClient
        val currentUrl = RetrofitClient.getBaseUrl()
        etBackendUrl.setText(currentUrl)
        updateCurrentUrlDisplay()
    }

    private fun updateCurrentUrlDisplay() {
        val currentUrl = RetrofitClient.getBaseUrl()
        tvCurrentUrl.text = "Current: $currentUrl"
    }

    private fun setupListeners() {
        btnSave.setOnClickListener {
            saveBackendUrl()
        }

        btnReset.setOnClickListener {
            resetToDefault()
        }
    }

    private fun saveBackendUrl() {
        val newUrl = etBackendUrl.text.toString().trim()

        // Validate URL
        if (newUrl.isEmpty()) {
            showError("URL cannot be empty")
            return
        }

        if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
            showError("URL must start with http:// or https://")
            return
        }

        if (!newUrl.endsWith("/")) {
            showError("URL must end with /")
            return
        }

        // Save to SharedPreferences
        val sharedPref = requireContext().getSharedPreferences(
            Constants.PREF_NAME,
            Context.MODE_PRIVATE
        )
        with(sharedPref.edit()) {
            putString(Constants.PREF_API_BASE_URL, newUrl)
            apply()
        }

        // Update Retrofit client
        RetrofitClient.updateBaseUrl(newUrl)

        updateCurrentUrlDisplay()
        showSuccess("Backend URL updated successfully!")
    }

    private fun resetToDefault() {
        val defaultUrl = Constants.BASE_URL
        etBackendUrl.setText(defaultUrl)

        val sharedPref = requireContext().getSharedPreferences(
            Constants.PREF_NAME,
            Context.MODE_PRIVATE
        )
        with(sharedPref.edit()) {
            putString(Constants.PREF_API_BASE_URL, defaultUrl)
            apply()
        }

        RetrofitClient.updateBaseUrl(defaultUrl)
        updateCurrentUrlDisplay()
        showSuccess("Reset to default URL")
    }

    private fun showError(message: String) {
        view?.let {
            Snackbar.make(it, message, Snackbar.LENGTH_LONG)
                .setBackgroundTint(requireContext().getColor(R.color.error_red))
                .show()
        }
    }

    private fun showSuccess(message: String) {
        view?.let {
            Snackbar.make(it, message, Snackbar.LENGTH_LONG)
                .setBackgroundTint(requireContext().getColor(R.color.success_green))
                .show()
        }
    }
}
