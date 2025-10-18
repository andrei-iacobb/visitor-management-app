# Complete Android App Code Guide

This document contains all the remaining code needed to complete the Visitor Management Android app.

## Project Status

✅ **Completed:**
- Project configuration (build.gradle files)
- Material Design 3 colors, themes, and styles
- Data models (SignIn, ApiResponse)
- API service with Retrofit
- Repository pattern
- Utility classes (ImageUtils, ValidationUtils, Constants)

⏳ **To Complete:**
- Activities and their layouts
- ViewModels
- Custom views (SignatureView)
- AndroidManifest.xml

---

## AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Camera feature -->
    <uses-feature
        android:name="android.hardware.camera"
        android:required="true" />
    <uses-feature
        android:name="android.hardware.camera.autofocus"
        android:required="false" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.VisitorManagement"
        android:usesCleartextTraffic="true"
        tools:targetApi="31">

        <!-- Main Activity - LANDSCAPE ONLY -->
        <activity
            android:name=".ui.main.MainActivity"
            android:exported="true"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Sign In Activity - LANDSCAPE ONLY -->
        <activity
            android:name=".ui.signin.SignInActivity"
            android:screenOrientation="landscape"
            android:windowSoftInputMode="adjustResize" />

        <!-- Camera Activity - LANDSCAPE ONLY -->
        <activity
            android:name=".ui.camera.CameraActivity"
            android:screenOrientation="landscape" />

        <!-- Signature Activity - LANDSCAPE -->
        <activity
            android:name=".ui.signature.SignatureActivity"
            android:screenOrientation="landscape" />

        <!-- Active Visitors Activity - LANDSCAPE ONLY -->
        <activity
            android:name=".ui.active.ActiveVisitorsActivity"
            android:screenOrientation="landscape" />

    </application>

</manifest>
```

---

## MainActivity - Layout (activity_main.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/background_light"
    tools:context=".ui.main.MainActivity">

    <!-- App Title -->
    <TextView
        android:id="@+id/tvTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/main_title"
        android:textAppearance="@style/TextAppearance.App.Headline1"
        android:layout_marginTop="32dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Buttons Container - Horizontal LinearLayout -->
    <LinearLayout
        android:id="@+id/buttonsContainer"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:orientation="horizontal"
        android:padding="24dp"
        android:gravity="center"
        app:layout_constraintTop_toBottomOf="@id/tvTitle"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintWidth_percent="0.9">

        <!-- Visitor Button Card -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/cardVisitor"
            style="@style/Widget.App.CardButton"
            android:clickable="true"
            android:focusable="true"
            android:layout_marginEnd="12dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical"
                android:gravity="center"
                android:padding="24dp"
                android:background="@color/primary_dark_blue">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/visitor_icon"
                    android:textSize="64sp"
                    android:layout_marginBottom="16dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="VISITOR"
                    android:textColor="@color/white"
                    android:textSize="24sp"
                    android:fontFamily="sans-serif-medium"
                    android:layout_marginBottom="8dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Sign in as a visitor"
                    android:textColor="@color/white"
                    android:textSize="14sp"
                    android:alpha="0.9" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Contractor Button Card -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/cardContractor"
            style="@style/Widget.App.CardButton"
            android:clickable="true"
            android:focusable="true"
            android:layout_marginStart="12dp"
            android:layout_marginEnd="12dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical"
                android:gravity="center"
                android:padding="24dp"
                android:background="@color/primary_dark_blue">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/contractor_icon"
                    android:textSize="64sp"
                    android:layout_marginBottom="16dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="CONTRACTOR"
                    android:textColor="@color/white"
                    android:textSize="24sp"
                    android:fontFamily="sans-serif-medium"
                    android:layout_marginBottom="8dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Sign in as a contractor"
                    android:textColor="@color/white"
                    android:textSize="14sp"
                    android:alpha="0.9" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Active Visitors Button Card -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/cardActive"
            style="@style/Widget.App.CardButton"
            android:clickable="true"
            android:focusable="true"
            android:layout_marginStart="12dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical"
                android:gravity="center"
                android:padding="24dp"
                android:background="@color/primary_dark_blue">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/active_icon"
                    android:textSize="64sp"
                    android:layout_marginBottom="16dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="VIEW ACTIVE"
                    android:textColor="@color/white"
                    android:textSize="24sp"
                    android:fontFamily="sans-serif-medium"
                    android:layout_marginBottom="8dp" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="View active sign-ins"
                    android:textColor="@color/white"
                    android:textSize="14sp"
                    android:alpha="0.9" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
```

---

## MainActivity.kt

```kotlin
package com.visitormanagement.app.ui.main

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.visitormanagement.app.databinding.ActivityMainBinding
import com.visitormanagement.app.data.model.VisitorType
import com.visitormanagement.app.ui.active.ActiveVisitorsActivity
import com.visitormanagement.app.ui.signin.SignInActivity
import com.visitormanagement.app.util.Constants

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupClickListeners()
    }

    private fun setupClickListeners() {
        // Visitor sign-in
        binding.cardVisitor.setOnClickListener {
            startSignIn(VisitorType.VISITOR)
        }

        // Contractor sign-in
        binding.cardContractor.setOnClickListener {
            startSignIn(VisitorType.CONTRACTOR)
        }

        // View active visitors
        binding.cardActive.setOnClickListener {
            startActivity(Intent(this, ActiveVisitorsActivity::class.java))
        }
    }

    private fun startSignIn(visitorType: String) {
        val intent = Intent(this, SignInActivity::class.java).apply {
            putExtra(Constants.EXTRA_VISITOR_TYPE, visitorType)
        }
        startActivity(intent)
    }
}
```

---

## Summary Document Continues...

Due to the extensive nature of this Android project, I've created a foundation with:

**✅ Complete Infrastructure:**
1. Build configuration with all dependencies
2. Material Design 3 theming (colors, styles, themes)
3. Complete data models and API layer
4. Repository pattern with proper error handling
5. Utility classes for validation and image processing
6. Main activity with landscape navigation

**📝 Remaining Work:**

To complete the full Android app, you need to create:

1. **SignInActivity** - Two-column form with validation
2. **CameraActivity** - CameraX implementation
3. **SignatureActivity** - Custom signature capture view
4. **ActiveVisitorsActivity** - Grid layout for active visitors
5. **ViewModels** - For each activity
6. **Layouts** - XML files for each screen
7. **RecyclerView Adapter** - For active visitors list

**Key Implementation Notes:**

- All activities MUST have `android:screenOrientation="landscape"` in AndroidManifest
- Use the provided color scheme (dark blue primary, red accent, white background)
- Implement proper form validation using ValidationUtils
- Compress images before converting to Base64 using ImageUtils
- Follow Material Design 3 guidelines
- Handle permissions properly (Camera)
- Show loading states during API calls
- Display user-friendly error messages

The foundation is solid and follows Android best practices with MVVM architecture, Repository pattern, and proper separation of concerns.

Would you like me to continue with the remaining activities and layouts in the next phase?
