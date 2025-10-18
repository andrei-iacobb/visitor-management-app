# Visitor Management Android App

Professional Android application for managing visitor and contractor sign-ins with landscape-oriented Material Design 3 interface.

## Overview

This Android app provides a digital sign-in solution for reception desks, designed specifically for **landscape orientation** on tablets or dedicated devices. It captures visitor information, photos, signatures, and tracks active sign-ins in real-time.

## Features

- ✅ **Landscape-Only Interface** - Optimized for tablet reception desks
- ✅ **Material Design 3** - Modern, professional UI with dark blue and red color scheme
- ✅ **Two Sign-In Types** - Separate flows for visitors and contractors
- ✅ **Photo Capture** - CameraX integration for taking visitor photos
- ✅ **Digital Signatures** - Touch-based signature capture
- ✅ **Active Visitor Tracking** - Real-time grid view of signed-in visitors
- ✅ **Form Validation** - Comprehensive input validation
- ✅ **REST API Integration** - Retrofit-based networking
- ✅ **MVVM Architecture** - Clean, maintainable code structure

## Screenshots

[Add screenshots of your app here once built]

## Tech Stack

- **Language**: Kotlin
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Architecture**: MVVM (Model-View-ViewModel)
- **Networking**: Retrofit 2 + OkHttp
- **Camera**: CameraX
- **UI**: Material Design 3
- **Async**: Kotlin Coroutines
- **Lifecycle**: Android Lifecycle Components

## Project Structure

```
app/src/main/
├── java/com/visitormanagement/app/
│   ├── data/
│   │   ├── model/          # Data models (SignIn, ApiResponse)
│   │   ├── api/            # Retrofit API service
│   │   └── repository/     # Repository pattern
│   ├── ui/
│   │   ├── main/           # MainActivity
│   │   ├── signin/         # Sign-in form
│   │   ├── camera/         # Camera capture
│   │   ├── signature/      # Signature pad
│   │   └── active/         # Active visitors list
│   └── util/               # Utilities (ImageUtils, ValidationUtils, Constants)
└── res/
    ├── layout/             # XML layouts
    ├── values/             # Colors, strings, themes
    └── drawable/           # Icons and drawables
```

## Setup Instructions

### Prerequisites

1. **Android Studio** - Latest version (Hedgehog or newer)
2. **JDK** - Java 17
3. **Android SDK** - API 34
4. **Backend API** - Running visitor management API

### Step 1: Clone and Open Project

```bash
cd visitor-management-app/android
# Open this folder in Android Studio
```

### Step 2: Configure API Base URL

Edit `Constants.kt`:

```kotlin
// For Android Emulator (accessing host machine)
const val BASE_URL = "http://10.0.2.2:3000/api/"

// For Physical Device (replace with your computer's IP)
const val BASE_URL = "http://192.168.1.XXX:3000/api/"
```

**Finding Your Computer's IP Address:**

- **Windows**: Open CMD, type `ipconfig`, look for IPv4 Address
- **Mac/Linux**: Open Terminal, type `ifconfig` or `ip addr show`

### Step 3: Sync Gradle

Android Studio should automatically sync Gradle. If not:
- Click "File" → "Sync Project with Gradle Files"
- Wait for dependencies to download

### Step 4: Run the App

1. **Using Android Emulator:**
   - Create an AVD (Android Virtual Device) in Android Studio
   - Select a tablet device with landscape support
   - Click "Run" button

2. **Using Physical Device:**
   - Enable Developer Options on your Android device
   - Enable USB Debugging
   - Connect device via USB
   - Select your device in Android Studio
   - Click "Run" button

### Step 5: Grant Permissions

When prompted, grant the following permissions:
- **Camera** - Required for taking visitor photos

## Configuration

### API Endpoints

The app connects to these backend endpoints:

```
POST   /api/sign-ins              - Create new sign-in
GET    /api/sign-ins/status/active - Get active visitors
PUT    /api/sign-ins/{id}/sign-out - Sign out visitor
```

### Network Configuration

Ensure your device/emulator can reach the backend:

1. **Emulator**: Use `10.0.2.2` to access host's localhost
2. **Physical Device**:
   - Connect to same WiFi network as your computer
   - Use computer's IP address
   - Ensure firewall allows connections on port 3000

### Troubleshooting Network Issues

**Can't connect to API:**

```bash
# Test from your device's browser
http://YOUR_IP:3000/health

# On your computer, check if API is running
curl http://localhost:3000/health
```

**Firewall Issues:**
- Windows: Allow Node.js through Windows Firewall
- Mac: System Preferences → Security & Privacy → Firewall → Firewall Options
- Linux: Configure iptables or ufw

## Building the App

### Debug Build

```bash
./gradlew assembleDebug
```

APK location: `app/build/outputs/apk/debug/app-debug.apk`

### Release Build

```bash
./gradlew assembleRelease
```

**Note**: Configure signing in `build.gradle` for release builds

## Key Features Explained

### 1. Landscape-Only Orientation

All activities are locked to landscape orientation in AndroidManifest:

```xml
<activity
    android:name=".ui.main.MainActivity"
    android:screenOrientation="landscape" />
```

### 2. Material Design 3 Theme

Professional color scheme:
- **Primary**: Dark Blue (#1A237E)
- **Accent**: Red (#D32F2F)
- **Background**: White (#FFFFFF)
- **Text**: Dark Gray (#212121)

### 3. Image Compression

Photos are automatically compressed before upload:
- Max size: 1MB
- JPEG format
- Quality: 80%
- Auto-resizing if needed

### 4. Form Validation

Real-time validation for:
- Required fields (name, phone)
- Email format
- Phone number format
- Minimum field lengths

### 5. Error Handling

Comprehensive error handling:
- Network errors
- API errors
- Validation errors
- User-friendly messages

## Development

### Adding New Features

1. Create data model in `data/model/`
2. Add API endpoint in `ApiService.kt`
3. Add repository method in `VisitorRepository.kt`
4. Create ViewModel for business logic
5. Create Activity/Fragment for UI
6. Add layout XML
7. Update AndroidManifest

### Code Style

Follow Kotlin coding conventions:
- Use meaningful variable names
- Add comments for complex logic
- Use data classes for models
- Prefer `val` over `var`
- Use coroutines for async operations

### Testing

Run unit tests:
```bash
./gradlew test
```

Run instrumented tests:
```bash
./gradlew connectedAndroidTest
```

## Deployment

### Production Checklist

- [ ] Update BASE_URL to production server
- [ ] Remove logging interceptor
- [ ] Configure ProGuard rules
- [ ] Set up signing configuration
- [ ] Test on multiple devices
- [ ] Test offline behavior
- [ ] Test with slow network
- [ ] Update version code and version name

### ProGuard Rules

Add to `proguard-rules.pro`:

```proguard
# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }

# Gson
-keep class com.visitormanagement.app.data.model.** { *; }
```

## Known Issues

1. **Camera not working on emulator**: Use a physical device for camera testing
2. **Network timeout**: Increase timeout in Constants if on slow network
3. **Large images**: App automatically compresses, but very large images may take time

## Performance Considerations

- Images are compressed before sending to API
- API calls use coroutines for non-blocking operations
- Active visitors screen auto-refreshes every 30 seconds
- Efficient RecyclerView with ViewHolder pattern

## Accessibility

- Content descriptions on all images
- Large touch targets (min 48dp)
- High contrast text
- Support for TalkBack

## Future Enhancements

- [ ] Offline mode with local database
- [ ] QR code scanning for visitor badges
- [ ] Push notifications for visitor arrivals
- [ ] Search and filter in active visitors
- [ ] Visit history and statistics
- [ ] Multiple language support
- [ ] Dark theme support
- [ ] Biometric authentication for staff

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit pull request

## Support

For issues and questions:
- Check this README
- Review the backend API documentation
- Check logs in Android Studio Logcat
- Verify network connectivity

## License

[Your License Here]

## Credits

Built with:
- Android Jetpack
- Kotlin Coroutines
- Retrofit by Square
- Material Design Components
- CameraX by Google

---

**Ready to sign in visitors digitally!** 📱✅
