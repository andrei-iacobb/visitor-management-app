# QUICK REFERENCE - Image Loading Issue Summary

## CRITICAL ISSUE

**Document image loading is BROKEN** due to API endpoint mismatch.

### The Problem in 30 Seconds

1. **Android App** requests: `GET /api/documents/CCN22a Notice to Contractors Ipswich-1.png`
2. **Backend** provides: `GET /api/documents/pdf/CCN22a Notice to Contractors Ipswich-1.png`
3. **Result:** 404 Error - Image never loads

### Where It Happens
- File: `SignInActivity.kt` line 221
- When user tries to sign in and must review the document
- Dialog never displays because image fetch fails

### Files Involved

| Location | Role | Issue |
|----------|------|-------|
| `android/.../ui/signature/PdfSignatureDialog.kt` | Fetches & displays image | Requests `/api/documents/{fileName}` ✓ |
| `backend/routes/documentRoutes.js` | Provides image | Only implements `/api/documents/pdf/{fileName}` ✗ |
| `backend/public/CCN22a Notice to Contractors Ipswich-1.png` | Image file | File exists (328 KB) but endpoint doesn't match |

### Quick Fix
Add this endpoint to `backend/routes/documentRoutes.js`:

```javascript
router.get('/:fileName', (req, res) => {
    try {
        const fileName = req.params.fileName;
        
        // Validate file name (allow images and PDFs)
        if (!fileName || fileName.includes('..') || fileName.includes('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file name'
            });
        }
        
        const filePath = path.join(publicFolder, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        
        // Send file as binary
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving file',
            error: error.message
        });
    }
});
```

---

## Image Loading Locations

### 1. Document Image (Signs-in Page)
- **When:** User clicks "Complete Sign-In" → Must review document
- **Display:** Full-screen dialog with document image and signature pad
- **File:** `PdfSignatureDialog.kt` - `loadAndDisplayImage()`
- **Error:** Shows retry dialog if fails
- **Status:** BROKEN (endpoint mismatch)

### 2. Visitor Photos (Admin Dashboard)
- **When:** Admin views active visitors list
- **Display:** 80x80 dp thumbnail in each visitor card
- **File:** `ActiveVisitorsFragment.kt` - `ActiveVisitorsAdapter.bind()`
- **Error:** Shows default person icon if fails
- **Status:** WORKING (photos come as Base64 in API response)

### 3. Signature Pad (Signs-in Page)
- **When:** User draws signature on document
- **Display:** White canvas that user writes on
- **File:** `CustomSignaturePad.kt`
- **Error:** None (generated in-memory)
- **Status:** WORKING (no external file)

---

## Image Libraries & Tools

### What's Used
- **BitmapFactory** - Decodes image bytes
- **ImageView** - Displays images
- **Base64** - Encodes/decodes text images
- **Custom ImageUtils.kt** - Compression, resizing, conversion

### What's NOT Used
- Glide ✗ (would help with caching)
- Picasso ✗ (would help with caching)
- Coil ✗ (would help with caching)

### Image Configuration
- Max size: 1 MB
- Quality: 80% JPEG
- Max dimensions: 1024x1024
- Format: JPEG (photos), PNG (documents)

---

## Error Handling

### Document Loading (PdfSignatureDialog)
```
Try to load
  → Success? Display image
  → Decode failure? Show error + retry option
  → Network failure? Show error + retry option
  → HTTP error? Show error + retry option
```

### Photo Display (ActiveVisitorsAdapter)
```
Try to decode Base64
  → Success? Display bitmap
  → Failure? Show default person icon (silently)
```

---

## File Locations

### Android Source Files
```
/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/
├── ui/signature/
│   ├── PdfSignatureDialog.kt (document loading - BROKEN)
│   └── CustomSignaturePad.kt (signature drawing - OK)
├── ui/admin/
│   └── ActiveVisitorsFragment.kt (photo display - OK)
├── data/api/
│   └── ApiService.kt (API endpoints - incorrect endpoint)
└── util/
    ├── ImageUtils.kt (image processing)
    └── Constants.kt (image config)
```

### Backend Files
```
/Users/andreiiacob/visitor-management-app/backend/
├── routes/documentRoutes.js (API endpoints - incomplete)
├── server.js (server config)
└── public/
    └── CCN22a Notice to Contractors Ipswich-1.png (the file - 328 KB)
```

### Layout Files
```
/Users/andreiiacob/visitor-management-app/android/app/src/main/res/layout/
├── dialog_pdf_signature.xml (document display)
├── item_active_visitor.xml (photo thumbnail)
└── fragment_active_visitors.xml (admin dashboard)
```

---

## Top Issues

### Critical
1. ✗ API endpoint mismatch (`/api/documents/` vs `/api/documents/pdf/`)

### Design Issues
2. ⚠ No image caching (Glide/Picasso would help)
3. ⚠ Base64 overhead (33% size increase for photos)
4. ⚠ File name has spaces (could cause encoding issues)
5. ⚠ Slow signature detection (pixel-by-pixel iteration)

### Minor
6. ⚠ 30-second network timeout (quite long)
7. ⚠ Inconsistent error handling (retry dialog vs silent fallback)

---

## To Test

- [ ] Sign in and try to review document (will fail with current code)
- [ ] View admin dashboard with active visitors (photos should work)
- [ ] Draw signature on signature pad (should work)
- [ ] Try to view visitor photo by clicking thumbnail (should work)

---

## Documentation

Full analysis available in: `/Users/andreiiacob/visitor-management-app/IMAGE_LOADING_ANALYSIS.md`

This file includes:
- Complete architecture overview
- All image loading code paths
- All error handling mechanisms
- Complete list of issues and recommendations
- Security analysis
- Testing checklist
