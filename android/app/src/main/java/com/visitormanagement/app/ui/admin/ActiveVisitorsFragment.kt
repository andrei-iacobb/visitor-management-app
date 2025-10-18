package com.visitormanagement.app.ui.admin

import android.graphics.Bitmap
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.visitormanagement.app.R
import com.visitormanagement.app.data.model.Result
import com.visitormanagement.app.data.model.SignIn
import com.visitormanagement.app.data.repository.VisitorRepository
import com.visitormanagement.app.util.ImageUtils
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class ActiveVisitorsFragment : Fragment(), RefreshableFragment {

    private lateinit var repository: VisitorRepository
    private lateinit var adapter: ActiveVisitorsAdapter

    private lateinit var rvActiveVisitors: RecyclerView
    private lateinit var progressBar: View
    private lateinit var emptyState: View
    private lateinit var tvActiveCount: TextView
    private lateinit var tvVisitorCount: TextView
    private lateinit var tvContractorCount: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_active_visitors, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        repository = VisitorRepository()
        initViews(view)
        setupRecyclerView()
        loadActiveVisitors()
    }

    private fun initViews(view: View) {
        rvActiveVisitors = view.findViewById(R.id.rvActiveVisitors)
        progressBar = view.findViewById(R.id.progressBar)
        emptyState = view.findViewById(R.id.emptyState)
        tvActiveCount = view.findViewById(R.id.tvActiveCount)
        tvVisitorCount = view.findViewById(R.id.tvVisitorCount)
        tvContractorCount = view.findViewById(R.id.tvContractorCount)
    }

    private fun setupRecyclerView() {
        adapter = ActiveVisitorsAdapter(
            onSignOut = { visitor -> confirmSignOut(visitor) },
            onPhotoClick = { photo -> showPhotoDialog(photo) }
        )
        rvActiveVisitors.layoutManager = LinearLayoutManager(context)
        rvActiveVisitors.adapter = adapter
    }

    private fun showPhotoDialog(photoBase64: String) {
        val bitmap = ImageUtils.base64ToBitmap(photoBase64)
        if (bitmap != null) {
            val imageView = ImageView(requireContext()).apply {
                setImageBitmap(bitmap)
                scaleType = ImageView.ScaleType.FIT_CENTER
            }

            AlertDialog.Builder(requireContext())
                .setView(imageView)
                .setPositiveButton("Close", null)
                .show()
        }
    }

    override fun refresh() {
        loadActiveVisitors()
    }

    private fun loadActiveVisitors() {
        showLoading(true)

        lifecycleScope.launch {
            when (val result = repository.getActiveVisitors()) {
                is Result.Success -> {
                    showLoading(false)
                    displayVisitors(result.data)
                }
                is Result.Error -> {
                    showLoading(false)
                    Toast.makeText(
                        context,
                        "Error: ${result.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> {}
            }
        }
    }

    private fun displayVisitors(visitors: List<SignIn>) {
        if (visitors.isEmpty()) {
            rvActiveVisitors.visibility = View.GONE
            emptyState.visibility = View.VISIBLE
        } else {
            rvActiveVisitors.visibility = View.VISIBLE
            emptyState.visibility = View.GONE
            adapter.submitList(visitors)
        }

        // Update stats
        tvActiveCount.text = visitors.size.toString()
        tvVisitorCount.text = visitors.count { it.visitorType == "visitor" }.toString()
        tvContractorCount.text = visitors.count { it.visitorType == "contractor" }.toString()
    }

    private fun confirmSignOut(visitor: SignIn) {
        AlertDialog.Builder(requireContext())
            .setTitle("Confirm Sign Out")
            .setMessage("Sign out ${visitor.fullName}?")
            .setPositiveButton("Yes") { _, _ ->
                performSignOut(visitor)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performSignOut(visitor: SignIn) {
        lifecycleScope.launch {
            when (val result = repository.signOutVisitor(visitor.id!!)) {
                is Result.Success -> {
                    Toast.makeText(
                        context,
                        "${visitor.fullName} signed out successfully",
                        Toast.LENGTH_SHORT
                    ).show()
                    loadActiveVisitors() // Refresh list
                }
                is Result.Error -> {
                    Toast.makeText(
                        context,
                        "Error: ${result.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> {}
            }
        }
    }

    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
}

// RecyclerView Adapter
class ActiveVisitorsAdapter(
    private val onSignOut: (SignIn) -> Unit,
    private val onPhotoClick: (String) -> Unit
) : RecyclerView.Adapter<ActiveVisitorsAdapter.ViewHolder>() {

    private var items = listOf<SignIn>()

    fun submitList(newItems: List<SignIn>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_active_visitor, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], onSignOut, onPhotoClick)
    }

    override fun getItemCount() = items.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val ivPhoto: ImageView = view.findViewById(R.id.ivPhoto)
        private val tvName: TextView = view.findViewById(R.id.tvName)
        private val tvType: TextView = view.findViewById(R.id.tvType)
        private val tvCompany: TextView = view.findViewById(R.id.tvCompany)
        private val tvVisiting: TextView = view.findViewById(R.id.tvVisiting)
        private val tvSignInTime: TextView = view.findViewById(R.id.tvSignInTime)
        private val tvDuration: TextView = view.findViewById(R.id.tvDuration)
        private val tvPurpose: TextView = view.findViewById(R.id.tvPurpose)
        private val btnSignOut: MaterialButton = view.findViewById(R.id.btnSignOut)

        fun bind(signIn: SignIn, onSignOut: (SignIn) -> Unit, onPhotoClick: (String) -> Unit) {
            tvName.text = signIn.fullName
            tvType.text = if (signIn.visitorType == "visitor") "VISITOR" else "CONTRACTOR"
            tvCompany.text = signIn.companyName ?: "N/A"
            tvVisiting.text = signIn.visitingPerson
            tvPurpose.text = signIn.purposeOfVisit

            // Display photo
            if (!signIn.photo.isNullOrBlank()) {
                val bitmap: Bitmap? = ImageUtils.base64ToBitmap(signIn.photo)
                if (bitmap != null) {
                    ivPhoto.setImageBitmap(bitmap)
                    ivPhoto.setOnClickListener {
                        onPhotoClick(signIn.photo)
                    }
                } else {
                    ivPhoto.setImageResource(R.drawable.ic_person)
                }
            } else {
                ivPhoto.setImageResource(R.drawable.ic_person)
            }

            // Format sign-in time
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            val signInTime = try {
                val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    .parse(signIn.signInTime ?: "")
                timeFormat.format(date ?: Date())
            } catch (e: Exception) {
                "Unknown"
            }
            tvSignInTime.text = signInTime

            // Calculate duration
            val duration = try {
                val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    .parse(signIn.signInTime ?: "")
                val diff = System.currentTimeMillis() - (date?.time ?: 0)
                val hours = TimeUnit.MILLISECONDS.toHours(diff)
                val minutes = TimeUnit.MILLISECONDS.toMinutes(diff) % 60
                "${hours}h ${minutes}m"
            } catch (e: Exception) {
                "0h 0m"
            }
            tvDuration.text = duration

            btnSignOut.setOnClickListener {
                onSignOut(signIn)
            }
        }
    }
}
