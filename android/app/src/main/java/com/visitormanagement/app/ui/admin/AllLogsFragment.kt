package com.visitormanagement.app.ui.admin

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.Result
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.repository.VisitorRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AllLogsFragment : Fragment(), RefreshableFragment {

    private lateinit var repository: VisitorRepository
    private lateinit var adapter: LogsAdapter

    private lateinit var rvLogs: RecyclerView
    private lateinit var progressBar: View
    private lateinit var emptyState: View
    private lateinit var btnFilterAll: MaterialButton
    private lateinit var btnFilterSignedIn: MaterialButton
    private lateinit var btnFilterSignedOut: MaterialButton
    private lateinit var btnFilterToday: MaterialButton

    private var currentFilter: String? = null
    private var allLogs = listOf<SignIn>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_all_logs, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        repository = VisitorRepository()
        initViews(view)
        setupRecyclerView()
        setupFilterButtons()
        loadLogs()
    }

    private fun initViews(view: View) {
        rvLogs = view.findViewById(R.id.rvLogs)
        progressBar = view.findViewById(R.id.progressBar)
        emptyState = view.findViewById(R.id.emptyState)
        btnFilterAll = view.findViewById(R.id.btnFilterAll)
        btnFilterSignedIn = view.findViewById(R.id.btnFilterSignedIn)
        btnFilterSignedOut = view.findViewById(R.id.btnFilterSignedOut)
        btnFilterToday = view.findViewById(R.id.btnFilterToday)
    }

    private fun setupRecyclerView() {
        adapter = LogsAdapter()
        rvLogs.layoutManager = LinearLayoutManager(context)
        rvLogs.adapter = adapter
    }

    private fun setupFilterButtons() {
        btnFilterAll.setOnClickListener {
            currentFilter = null
            applyFilter()
            updateFilterButtonStates()
        }

        btnFilterSignedIn.setOnClickListener {
            currentFilter = "signed_in"
            applyFilter()
            updateFilterButtonStates()
        }

        btnFilterSignedOut.setOnClickListener {
            currentFilter = "signed_out"
            applyFilter()
            updateFilterButtonStates()
        }

        btnFilterToday.setOnClickListener {
            currentFilter = "today"
            applyFilter()
            updateFilterButtonStates()
        }

        updateFilterButtonStates()
    }

    private fun updateFilterButtonStates() {
        val context = requireContext()
        val primaryColor = context.getColor(R.color.primary)
        val whiteColor = context.getColor(R.color.white)

        listOf(btnFilterAll, btnFilterSignedIn, btnFilterSignedOut, btnFilterToday).forEach { btn ->
            btn.setTextColor(primaryColor)
            btn.setBackgroundColor(whiteColor)
        }

        val selectedButton = when (currentFilter) {
            null -> btnFilterAll
            "signed_in" -> btnFilterSignedIn
            "signed_out" -> btnFilterSignedOut
            "today" -> btnFilterToday
            else -> btnFilterAll
        }

        selectedButton.setTextColor(whiteColor)
        selectedButton.setBackgroundColor(primaryColor)
    }

    override fun refresh() {
        loadLogs()
    }

    private fun loadLogs() {
        showLoading(true)
        Log.d("AllLogsFragment", "Starting to load logs...")

        lifecycleScope.launch {
            when (val result = repository.getSignIns(limit = 100)) {
                is Result.Success -> {
                    Log.d("AllLogsFragment", "Successfully loaded ${result.data.size} logs")
                    showLoading(false)
                    allLogs = result.data
                    applyFilter()
                    Toast.makeText(context, "Loaded ${result.data.size} records", Toast.LENGTH_SHORT).show()
                }
                is Result.Error -> {
                    Log.e("AllLogsFragment", "Error loading logs: ${result.message}", result.exception)
                    showLoading(false)
                    Toast.makeText(
                        context,
                        "Error: ${result.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> {
                    Log.d("AllLogsFragment", "Unexpected result state")
                }
            }
        }
    }

    private fun applyFilter() {
        val filtered = when (currentFilter) {
            "signed_in" -> allLogs.filter { it.status == "signed_in" }
            "signed_out" -> allLogs.filter { it.status == "signed_out" }
            "today" -> {
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                allLogs.filter { signIn ->
                    signIn.signInTime?.startsWith(today) == true
                }
            }
            else -> allLogs
        }

        displayLogs(filtered)
    }

    private fun displayLogs(logs: List<SignIn>) {
        if (logs.isEmpty()) {
            rvLogs.visibility = View.GONE
            emptyState.visibility = View.VISIBLE
        } else {
            rvLogs.visibility = View.VISIBLE
            emptyState.visibility = View.GONE
            adapter.submitList(logs)
        }
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
}

// RecyclerView Adapter
class LogsAdapter : RecyclerView.Adapter<LogsAdapter.ViewHolder>() {

    private var items = listOf<SignIn>()

    fun submitList(newItems: List<SignIn>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_log_entry, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val tvName: TextView = view.findViewById(R.id.tvName)
        private val tvType: TextView = view.findViewById(R.id.tvType)
        private val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        private val tvCompany: TextView = view.findViewById(R.id.tvCompany)
        private val tvPhone: TextView = view.findViewById(R.id.tvPhone)
        private val tvVisiting: TextView = view.findViewById(R.id.tvVisiting)
        private val tvPurpose: TextView = view.findViewById(R.id.tvPurpose)
        private val tvSignInTime: TextView = view.findViewById(R.id.tvSignInTime)
        private val tvSignOutTime: TextView = view.findViewById(R.id.tvSignOutTime)

        fun bind(signIn: SignIn) {
            tvName.text = signIn.fullName
            tvType.text = if (signIn.visitorType == "visitor") "VISITOR" else "CONTRACTOR"
            tvStatus.text = if (signIn.status == "signed_in") "SIGNED IN" else "SIGNED OUT"
            tvCompany.text = signIn.companyName ?: "N/A"
            tvPhone.text = signIn.phoneNumber
            tvVisiting.text = signIn.visitingPerson
            tvPurpose.text = signIn.purposeOfVisit

            // Format times
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())

            tvSignInTime.text = try {
                val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    .parse(signIn.signInTime ?: "")
                timeFormat.format(date ?: Date())
            } catch (e: Exception) {
                "Unknown"
            }

            tvSignOutTime.text = if (signIn.signOutTime != null) {
                try {
                    val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                        .parse(signIn.signOutTime)
                    timeFormat.format(date ?: Date())
                } catch (e: Exception) {
                    "Unknown"
                }
            } else {
                "Not signed out"
            }
        }
    }
}
