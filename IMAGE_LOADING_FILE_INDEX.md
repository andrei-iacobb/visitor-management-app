# File Index - Image Loading Implementation

## Android App - Image Loading Files

### Core Image Loading
1. **PdfSignatureDialog.kt** (BROKEN)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/ui/signature/PdfSignatureDialog.kt`
   - Lines: 48-74 (loadAndDisplayImage function)
   - Issue: Requests `/api/documents/{fileName}` but backend only provides `/api/documents/pdf/{fileName}`
   - Size: 170 lines
   - Key methods:
     - `loadAndDisplayImage()` - Fetches image from API
     - `displaySignatureDialog()` - Shows image in dialog
     - `bitmapToBase64()` - Converts signature to Base64
     - `displayError()` - Shows error with retry

2. **ActiveVisitorsFragment.kt** (WORKING)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/ui/admin/ActiveVisitorsFragment.kt`
   - Lines: 75-88 (showPhotoDialog function)
   - Lines: 207-256 (ActiveVisitorsAdapter.bind function)
   - Size: 259 lines
   - Key methods:
     - `showPhotoDialog()` - Displays full photo in dialog
     - `bind()` - Displays thumbnail in list
     - Uses Base64 photos from API response

### API Definition
3. **ApiService.kt** (INCORRECT)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/data/api/ApiService.kt`
   - Lines: 110-113 (getDocument endpoint definition)
   - Size: 116 lines
   - Issue: Defines endpoint as `/api/documents/{fileName}` but backend implements `/api/documents/pdf/{fileName}`

### Image Utilities
4. **ImageUtils.kt** (COMPLETE)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/util/ImageUtils.kt`
   - Size: 186 lines
   - Functions:
     - `bitmapToBase64()` (lines 18-24) - Bitmap to Base64 with data URI prefix
     - `base64ToBitmap()` (lines 29-39) - Base64 to Bitmap with error handling
     - `resizeImage()` (lines 44-64) - Resize to max dimensions
     - `compressBitmap()` (lines 69-76) - Compress and resize
     - `rotateBitmap()` (lines 81-86) - Rotate bitmap
     - `getBase64Size()` (lines 91-94) - Estimate Base64 size
     - `exceedsMaxSize()` (lines 99-101) - Check size limit
     - `compressToMaxSize()` (lines 106-134) - Iterative compression
     - `createSignatureBitmap()` (lines 139-143) - Create white canvas
     - `isBitmapEmpty()` (lines 148-171) - Check if mostly blank
     - `compressFile()` (lines 176-184) - Load and compress file

### Configuration
5. **Constants.kt** (IMAGE SETTINGS)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`
   - Lines: 18-22 (Image configuration)
   - Settings:
     - MAX_IMAGE_SIZE_BYTES = 1MB
     - IMAGE_QUALITY = 80
     - IMAGE_MAX_WIDTH = 1024
     - IMAGE_MAX_HEIGHT = 1024

### Layout Files (XML)
6. **dialog_pdf_signature.xml** (DOCUMENT DISPLAY)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/res/layout/dialog_pdf_signature.xml`
   - Size: 118 lines
   - Components:
     - ImageView (ivPdfPage) - lines 39-44 - FIT_CENTER scale type
     - CustomSignaturePad - lines 68-74
   - Container: ScrollView for long documents

7. **item_active_visitor.xml** (PHOTO THUMBNAIL)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/res/layout/item_active_visitor.xml`
   - Size: 188 lines
   - Components:
     - ImageView (ivPhoto) - lines 24-30 - CENTER_CROP scale type
     - Size: 80dp x 80dp
     - Card view wrapper with corner radius

### Signature Capture
8. **CustomSignaturePad.kt** (WORKING)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/ui/signature/CustomSignaturePad.kt`
   - Size: 121 lines
   - Functions:
     - `onSizeChanged()` - Create bitmap (lines 40-48)
     - `onDraw()` - Draw bitmap on canvas (lines 50-55)
     - `onTouchEvent()` - Handle touch for drawing (lines 57-87)
     - `clear()` - Clear signature (lines 92-97)
     - `getSignatureBitmap()` - Get signature as bitmap (lines 102-104)
     - `hasSignature()` - Check if not empty (lines 109-119)

### Entry Point
9. **SignInActivity.kt** (USES DIALOG)
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/ui/signin/SignInActivity.kt`
   - Line: 221 (Creates PdfSignatureDialog with filename)
   - Creates dialog: `PdfSignatureDialog(this, lifecycleScope, "CCN22a Notice to Contractors Ipswich-1.png")`

---

## Backend - Image Serving Files

### Main Document Routes
1. **documentRoutes.js** (INCOMPLETE)
   - Location: `/Users/andreiiacob/visitor-management-app/backend/routes/documentRoutes.js`
   - Size: 194 lines
   - Endpoints:
     - Line 58: GET `/api/documents/list` - List PDFs ✓
     - Line 89: GET `/api/documents/pdf/:fileName` - Get PDF ✓
     - Line 150: GET `/api/documents/pdf/default` - Get first PDF ✓
     - Missing: GET `/api/documents/:fileName` ✗
   - Functions:
     - `scanForPDFs()` (lines 14-28) - List files in public folder
     - `initializePDFWatcher()` (lines 33-52) - Watch for changes
     - Route: /list (lines 58-82)
     - Route: /pdf/:fileName (lines 89-144)
     - Route: /pdf/default (lines 150-192)

### Server Configuration
2. **server.js** (WIRES ROUTES)
   - Location: `/Users/andreiiacob/visitor-management-app/backend/server.js`
   - Line 87: Registers document routes
   - Line 100: Lists documents endpoint in root
   - Note: Routes are wired correctly, just incomplete

### Document File
3. **CCN22a Notice to Contractors Ipswich-1.png** (THE FILE)
   - Location: `/Users/andreiiacob/visitor-management-app/backend/public/CCN22a Notice to Contractors Ipswich-1.png`
   - Size: 327,830 bytes (328 KB)
   - Format: PNG image
   - Currently accessible via: `/api/documents/pdf/CCN22a Notice to Contractors Ipswich-1.png`
   - Needed by app at: `/api/documents/CCN22a Notice to Contractors Ipswich-1.png`

---

## Data Models

1. **SignIn.kt**
   - Location: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/data/model/SignIn.kt`
   - Field: `photo: String?` (line 34) - Base64 encoded image
   - Field: `signature: String?` (line 36) - Base64 encoded signature
   - Note: Photos come from API as Base64 in JSON

---

## Summary by Purpose

### Image Loading Flow
```
SignInActivity (line 221)
  ↓
PdfSignatureDialog.show() (line 42)
  ↓
PdfSignatureDialog.loadAndDisplayImage() (line 48-74)
  ↓
ApiService.getDocument() (line 111)
  ↓
HTTP GET /api/documents/{fileName}
  ↓
[MISSING ENDPOINT - 404 Error]
```

### Photo Display Flow
```
ActiveVisitorsFragment.bind() (line 207)
  ↓
ImageUtils.base64ToBitmap() (line 29)
  ↓
ImageView.setImageBitmap() (line 218)
  ↓
[WORKING - Photo displayed]
```

### Signature Capture Flow
```
CustomSignaturePad.onTouchEvent() (line 57)
  ↓
CustomSignaturePad.getSignatureBitmap() (line 102)
  ↓
ImageUtils.bitmapToBase64() (line 18)
  ↓
SignInRequest.signature (Base64 string)
  ↓
[WORKING - Signature captured and encoded]
```

---

## File Stats

### Android Source Files
- Total Kotlin files in image loading: 6
- Total XML layout files: 2
- Total utility files: 1

### Backend Files
- Total JavaScript files in image serving: 1
- Total image files: 1
- Total configuration: 1

### Lines of Code
- Android image loading logic: ~550 lines
- Android image utilities: ~186 lines
- Backend image serving: ~194 lines
- XML layouts: ~306 lines
- **Total: ~1,236 lines of code**

---

## Issue Tracking

| File | Issue | Severity | Line | Fix Required |
|------|-------|----------|------|--------------|
| ApiService.kt | Wrong endpoint path | CRITICAL | 111 | Update endpoint in docs |
| documentRoutes.js | Missing endpoint | CRITICAL | N/A | Add route handler |
| SignInActivity.kt | Uses PNG filename | HIGH | 221 | Rename file or fix endpoint |
| documentRoutes.js | Only accepts .pdf | HIGH | 94 | Update file validation |
| ImageUtils.kt | Pixel iteration | MEDIUM | 150 | Optimize for large bitmaps |
| Constants.kt | Long timeout | MEDIUM | 14 | Reduce to 15 seconds |

---

## Key Findings

1. **Image loading is NOT broken everywhere** - only document image loading
2. **Photos work fine** - they use Base64 encoding in API response
3. **Signatures work fine** - they're generated in-memory
4. **No external image libraries used** - relying on Android BitmapFactory
5. **Error handling is good** - but inconsistent between document and photos

---

## What Would Fix It

1. Add endpoint handler for `/api/documents/:fileName` in documentRoutes.js
2. Update file validation to accept image extensions
3. Update ApiService endpoint documentation (or change it to `/api/documents/pdf/`)
4. Rename file to remove spaces (optional but recommended)
5. (Optional) Add image caching library like Glide

