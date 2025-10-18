# Android App Development Guide

Guide for building the Android frontend for the Visitor Management System.

## Overview

This guide outlines the structure and implementation approach for the Android mobile application that will interface with the Visitor Management API.

## Tech Stack Options

### Option 1: Native Android (Kotlin) - Recommended
**Pros:**
- Best performance
- Full access to device features
- Better camera integration
- Native signature capture
- Offline capabilities

**Cons:**
- More development time
- Requires Android development knowledge

### Option 2: React Native
**Pros:**
- Cross-platform (iOS + Android)
- Faster development
- JavaScript/TypeScript
- Large ecosystem

**Cons:**
- Less performant for camera operations
- May need native modules

## App Architecture (Native Kotlin)

### Project Structure
```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/company/visitormanagement/
│   │   │   │   ├── models/
│   │   │   │   │   ├── SignIn.kt
│   │   │   │   │   ├── Staff.kt
│   │   │   │   │   └── ApiResponse.kt
│   │   │   │   ├── network/
│   │   │   │   │   ├── ApiService.kt
│   │   │   │   │   ├── RetrofitClient.kt
│   │   │   │   │   └── ApiRepository.kt
│   │   │   │   ├── ui/
│   │   │   │   │   ├── MainActivity.kt
│   │   │   │   │   ├── SignInActivity.kt
│   │   │   │   │   ├── ActiveVisitorsActivity.kt
│   │   │   │   │   └── adapters/
│   │   │   │   │       └── VisitorAdapter.kt
│   │   │   │   ├── utils/
│   │   │   │   │   ├── CameraHelper.kt
│   │   │   │   │   ├── SignatureView.kt
│   │   │   │   │   └── Base64Helper.kt
│   │   │   │   └── database/
│   │   │   │       ├── AppDatabase.kt
│   │   │   │       └── SignInDao.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   ├── drawable/
│   │   │   │   └── values/
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## Required Permissions (AndroidManifest.xml)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.company.visitormanagement">

    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <uses-feature android:name="android.hardware.camera" android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:usesCleartextTraffic="true">
        <!-- Activities here -->
    </application>
</manifest>
```

## Dependencies (build.gradle)

```gradle
dependencies {
    // Core Android
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'

    // Retrofit for API calls
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // ViewModel and LiveData
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.7.0'

    // Room Database (for offline storage)
    implementation 'androidx.room:room-runtime:2.6.1'
    kapt 'androidx.room:room-compiler:2.6.1'
    implementation 'androidx.room:room-ktx:2.6.1'

    // CameraX
    implementation 'androidx.camera:camera-core:1.3.1'
    implementation 'androidx.camera:camera-camera2:1.3.1'
    implementation 'androidx.camera:camera-lifecycle:1.3.1'
    implementation 'androidx.camera:camera-view:1.3.1'

    // Image processing
    implementation 'com.github.bumptech.glide:glide:4.16.0'

    // Testing
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
}
```

## Key Implementation Files

### 1. API Service (ApiService.kt)

```kotlin
interface ApiService {
    @POST("sign-ins")
    suspend fun createSignIn(@Body signIn: SignInRequest): Response<ApiResponse<SignIn>>

    @GET("sign-ins/status/active")
    suspend fun getActiveVisitors(): Response<ApiResponse<List<SignIn>>>

    @PUT("sign-ins/{id}/sign-out")
    suspend fun signOutVisitor(@Path("id") id: Int): Response<ApiResponse<SignIn>>

    @GET("staff")
    suspend fun getStaff(): Response<ApiResponse<List<Staff>>>
}
```

### 2. Retrofit Client (RetrofitClient.kt)

```kotlin
object RetrofitClient {
    private const val BASE_URL = "http://10.0.2.2:3000/api/" // Android emulator localhost
    // For physical device: "http://YOUR_COMPUTER_IP:3000/api/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
```

### 3. Data Models (SignIn.kt)

```kotlin
data class SignIn(
    val id: Int? = null,
    val visitor_type: String,
    val full_name: String,
    val phone_number: String,
    val email: String?,
    val company_name: String?,
    val purpose_of_visit: String,
    val car_registration: String?,
    val visiting_person: String,
    val photo: String?,
    val signature: String?,
    val sign_in_time: String?,
    val sign_out_time: String?,
    val status: String?
)

data class SignInRequest(
    val visitor_type: String,
    val full_name: String,
    val phone_number: String,
    val email: String?,
    val company_name: String?,
    val purpose_of_visit: String,
    val car_registration: String?,
    val visiting_person: String,
    val photo: String?,
    val signature: String?
)

data class ApiResponse<T>(
    val success: Boolean,
    val message: String?,
    val data: T?,
    val errors: List<ValidationError>?
)

data class ValidationError(
    val msg: String,
    val param: String
)

data class Staff(
    val id: Int,
    val name: String,
    val email: String,
    val department: String?
)
```

### 4. Signature View (SignatureView.kt)

```kotlin
class SignatureView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val path = Path()
    private val paint = Paint().apply {
        color = Color.BLACK
        strokeWidth = 5f
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        isAntiAlias = true
    }

    private var isEmpty = true

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                path.moveTo(x, y)
                isEmpty = false
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                path.lineTo(x, y)
            }
            MotionEvent.ACTION_UP -> {
                // Drawing complete
            }
        }

        invalidate()
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawPath(path, paint)
    }

    fun clear() {
        path.reset()
        isEmpty = true
        invalidate()
    }

    fun getSignatureBase64(): String? {
        if (isEmpty) return null

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        draw(canvas)

        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val bytes = outputStream.toByteArray()

        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
```

### 5. Camera Helper (CameraHelper.kt)

```kotlin
class CameraHelper(private val activity: Activity) {

    private val CAMERA_PERMISSION_CODE = 100
    private val CAMERA_REQUEST_CODE = 101

    fun checkCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun requestCameraPermission() {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.CAMERA),
            CAMERA_PERMISSION_CODE
        )
    }

    fun capturePhoto(onResult: (String?) -> Unit) {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (intent.resolveActivity(activity.packageManager) != null) {
            activity.startActivityForResult(intent, CAMERA_REQUEST_CODE)
        }
    }

    fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val bytes = outputStream.toByteArray()
        return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
```

## Screen Layouts

### Main Screen (activity_main.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:gravity="center">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Visitor Management System"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="32dp"/>

    <Button
        android:id="@+id/btnVisitor"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Sign In Visitor"
        android:padding="16dp"
        android:layout_marginBottom="16dp"/>

    <Button
        android:id="@+id/btnContractor"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Sign In Contractor"
        android:padding="16dp"
        android:layout_marginBottom="16dp"/>

    <Button
        android:id="@+id/btnActiveVisitors"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="View Active Visitors"
        android:padding="16dp"/>

</LinearLayout>
```

### Sign-In Form (activity_signin.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp">

        <TextView
            android:id="@+id/tvTitle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Visitor Sign-In"
            android:textSize="20sp"
            android:textStyle="bold"
            android:layout_marginBottom="16dp"/>

        <com.google.android.material.textfield.TextInputLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="8dp">
            <EditText
                android:id="@+id/etFullName"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:hint="Full Name *"
                android:inputType="textPersonName"/>
        </com.google.android.material.textfield.TextInputLayout>

        <com.google.android.material.textfield.TextInputLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="8dp">
            <EditText
                android:id="@+id/etPhone"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:hint="Phone Number *"
                android:inputType="phone"/>
        </com.google.android.material.textfield.TextInputLayout>

        <!-- More fields... -->

        <Button
            android:id="@+id/btnTakePhoto"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Take Photo"
            android:layout_marginTop="8dp"/>

        <ImageView
            android:id="@+id/ivPhoto"
            android:layout_width="200dp"
            android:layout_height="200dp"
            android:layout_gravity="center"
            android:scaleType="centerCrop"
            android:visibility="gone"/>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Signature *"
            android:textSize="16sp"
            android:layout_marginTop="16dp"/>

        <com.company.visitormanagement.utils.SignatureView
            android:id="@+id/signatureView"
            android:layout_width="match_parent"
            android:layout_height="200dp"
            android:background="@android:color/white"
            android:layout_marginTop="8dp"/>

        <Button
            android:id="@+id/btnClearSignature"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Clear Signature"
            android:layout_gravity="end"/>

        <Button
            android:id="@+id/btnSubmit"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Submit Sign-In"
            android:layout_marginTop="24dp"/>

    </LinearLayout>
</ScrollView>
```

## Implementation Steps

### Phase 1: Basic Setup
1. Create new Android Studio project
2. Add dependencies to build.gradle
3. Configure AndroidManifest.xml with permissions
4. Set up Retrofit and API service

### Phase 2: Core Features
1. Implement main activity with navigation
2. Create sign-in form activity
3. Implement camera functionality
4. Create signature capture view
5. Add API integration

### Phase 3: Advanced Features
1. Create active visitors list
2. Implement sign-out functionality
3. Add offline storage with Room
4. Implement data sync when online
5. Add form validation

### Phase 4: Polish
1. Add loading indicators
2. Implement error handling
3. Add success/failure messages
4. Improve UI/UX
5. Add app icon and branding

## Configuration

### API Base URL

For development:
- **Android Emulator**: `http://10.0.2.2:3000/api/`
- **Physical Device**: `http://YOUR_COMPUTER_IP:3000/api/`
- **Production**: `https://your-domain.com/api/`

Update in `RetrofitClient.kt`:
```kotlin
private const val BASE_URL = "http://10.0.2.2:3000/api/"
```

## Testing

### On Emulator
1. Start backend server on host machine
2. Use `10.0.2.2` to access localhost
3. Run app in emulator

### On Physical Device
1. Connect device and computer to same network
2. Find computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update BASE_URL with computer's IP
4. Ensure firewall allows connections on port 3000

## Best Practices

1. **Error Handling**: Always handle API failures gracefully
2. **Loading States**: Show progress indicators during API calls
3. **Validation**: Validate inputs before API calls
4. **Offline Support**: Store data locally and sync when online
5. **Security**: Use HTTPS in production
6. **User Feedback**: Show clear success/error messages
7. **Image Optimization**: Compress images before upload
8. **Memory Management**: Properly dispose of camera and bitmap resources

## Future Enhancements

- [ ] QR code scanning for visitor pre-registration
- [ ] Push notifications for visitor arrivals
- [ ] Visitor history and search
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Visitor badge generation
- [ ] Biometric authentication for staff
- [ ] Analytics dashboard

## Resources

- [Android Developer Docs](https://developer.android.com/)
- [Retrofit Documentation](https://square.github.io/retrofit/)
- [CameraX Guide](https://developer.android.com/training/camerax)
- [Material Design](https://material.io/develop/android)

## Support

For Android development questions:
- Check official Android documentation
- Review Retrofit examples
- Test API endpoints with Postman first
- Use Android Studio's debugging tools
