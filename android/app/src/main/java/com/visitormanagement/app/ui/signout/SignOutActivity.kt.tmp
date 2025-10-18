package com.visitormanagement.app.ui.signout

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.Result
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.repository.VisitorRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class SignOutActivity : AppCompatActivity() {

    private lateinit var repository: VisitorRepository
    private lateinit var adapter: SignOutAdapter

    private lateinit var tilName: TextInputLayout
    private lateinit var etName: TextInputEditText
    private lateinit var progressBar: View
    private lateinit var resultsContainer: View
    private lateinit var emptyState: View
    private lateinit var rvResults: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sign_out)

        repository = VisitorRepository()

        initViews()
        setupRecyclerView()
        setupListeners()
    }

    private fun initViews() {
        tilName = findViewById(R.id.tilName)
        etName = findViewById(R.id.etName)
        progressBar = findViewById(R.id.progressBar)
        resultsContainer = findViewById(R.id.resultsContainer)
        emptyState = findViewById(R.id.emptyState)
        rvResults = findViewById(R.id.rvResults)
    }

    private fun setupRecyclerView() {
        adapter = SignOutAdapter { signIn ->
            confirmSignOut(signIn)
        }
        rvResults.layoutManager = LinearLayoutManager(this)
        rvResults.adapter = adapter
    }

    private fun setupListeners() {
        findViewById<View>(R.id.btnBack).setOnClickListener {
            finish()
        }

        findViewById<View>(R.id.btnSearch).setOnClickListener {
            searchVisitors()
        }
    }

    private fun searchVisitors() {
        val name = etName.text?.toString()?.trim()

        if (name.isNullOrBlank()) {
            tilName.error = "Please enter a name"
            return
        }

        tilName.error = null
        showLoading(true)

        lifecycleScope.launch {
            when (val result = repository.getActiveVisitors()) {
                is Result.Success -> {
                    showLoading(false)
                    val filteredVisitors = result.data.filter {
                        it.fullName.contains(name, ignoreCase = true)
                    }
                    displayResults(filteredVisitors)
                }
                is Result.Error -> {
                    showLoading(false)
                    Toast.makeText(
                        this@SignOutActivity,
                        "Error loading visitors: ${result.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> {}
            }
        }
    }

    private fun displayResults(visitors: List<SignIn>) {
        if (visitors.isEmpty()) {
            resultsContainer.visibility = View.GONE
            emptyState.visibility = View.VISIBLE
        } else {
            resultsContainer.visibility = View.VISIBLE
            emptyState.visibility = View.GONE
            adapter.submitList(visitors)
        }
    }

    private fun confirmSignOut(signIn: SignIn) {
        AlertDialog.Builder(this)
            .setTitle("Confirm Sign Out")
            .setMessage("Sign out ${signIn.fullName}?")
            .setPositiveButton("Yes") { _, _ ->
                performSignOut(signIn)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performSignOut(signIn: SignIn) {
        showLoading(true)

        lifecycleScope.launch {
            when (val result = repository.signOutVisitor(signIn.id!!)) {
                is Result.Success -> {
                    showLoading(false)
                    showSuccessDialog(result.data.fullName)
                }
                is Result.Error -> {
                    showLoading(false)
                    Toast.makeText(
                        this@SignOutActivity,
                        "Error: ${result.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> {}
            }
        }
    }

    private fun showSuccessDialog(name: String) {
        AlertDialog.Builder(this)
            .setTitle("Success!")
            .setMessage("$name has been signed out")
            .setPositiveButton("OK") { _, _ ->
                // Clear search and refresh
                etName.text?.clear()
                resultsContainer.visibility = View.GONE
                emptyState.visibility = View.GONE
            }
            .setCancelable(false)
            .show()
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
}

// RecyclerView Adapter
class SignOutAdapter(
    private val onSignOut: (SignIn) -> Unit
) : RecyclerView.Adapter<SignOutAdapter.ViewHolder>() {

    private var items = listOf<SignIn>()

    fun submitList(newItems: List<SignIn>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_sign_out_result, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], onSignOut)
    }

    override fun getItemCount() = items.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val tvName: TextView = view.findViewById(R.id.tvName)
        private val tvDetails: TextView = view.findViewById(R.id.tvDetails)
        private val tvType: TextView = view.findViewById(R.id.tvType)
        private val btnSignOut: MaterialButton = view.findViewById(R.id.btnSignOut)

        fun bind(signIn: SignIn, onSignOut: (SignIn) -> Unit) {
            tvName.text = signIn.fullName

            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            val signInTime = try {
                val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    .parse(signIn.signInTime ?: "")
                timeFormat.format(date ?: Date())
            } catch (e: Exception) {
                "Unknown"
            }

            tvDetails.text = "Visiting: ${signIn.visitingPerson} • Signed in: $signInTime"
            tvType.text = if (signIn.visitorType == "visitor") "Visitor" else "Contractor"

            btnSignOut.setOnClickListener {
                onSignOut(signIn)
            }
        }
    }
}
