const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Cache for available PDFs and images - updated whenever files change
let availablePDFs = [];
let availableFiles = [];
const publicFolder = path.join(__dirname, '../public');
const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp'];

/**
 * Scan public folder for PDF files
 * Returns array of PDF file names
 */
function scanForPDFs() {
    try {
        if (!fs.existsSync(publicFolder)) {
            return [];
        }

        const files = fs.readdirSync(publicFolder);
        return files
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .sort();
    } catch (error) {
        console.error('Error scanning PDF folder:', error);
        return [];
    }
}

/**
 * Scan public folder for all supported files (PDFs and images)
 * Returns array of file names
 */
function scanForAllFiles() {
    try {
        if (!fs.existsSync(publicFolder)) {
            return [];
        }

        const files = fs.readdirSync(publicFolder);
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return SUPPORTED_EXTENSIONS.includes(ext);
            })
            .sort();
    } catch (error) {
        console.error('Error scanning file folder:', error);
        return [];
    }
}

/**
 * Initialize and watch for PDF changes
 */
function initializePDFWatcher() {
    // Initial scan
    availablePDFs = scanForPDFs();
    availableFiles = scanForAllFiles();
    console.log(`✓ Found ${availablePDFs.length} PDF(s) in public folder:`, availablePDFs);
    console.log(`✓ Found ${availableFiles.length} total file(s) (PDFs and images):`, availableFiles);

    // Watch for file changes
    try {
        fs.watch(publicFolder, (eventType, filename) => {
            if (filename) {
                const ext = path.extname(filename).toLowerCase();
                if (ext === '.pdf') {
                    availablePDFs = scanForPDFs();
                    console.log(`✓ PDFs updated (${eventType}):`, availablePDFs);
                }
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    availableFiles = scanForAllFiles();
                    console.log(`✓ Files updated (${eventType}):`, availableFiles);
                }
            }
        });
    } catch (error) {
        console.warn('Warning: Could not set up folder watcher:', error.message);
    }
}

// Initialize on startup
initializePDFWatcher();

/**
 * GET /api/documents/list
 * List all available PDF files
 */
router.get('/list', (req, res) => {
    try {
        const pdfList = availablePDFs.map(fileName => ({
            fileName: fileName,
            title: fileName.replace('.pdf', '').replace(/_/g, ' '),
            path: `/api/documents/pdf/${fileName}`
        }));

        res.json({
            success: true,
            data: {
                count: pdfList.length,
                pdfs: pdfList,
                lastScanned: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error listing PDFs:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing documents',
            error: error.message
        });
    }
});

/**
 * GET /api/documents/pdf/:fileName
 * Get PDF as base64 for preview in app
 * @param fileName - PDF file name (e.g., "VISITOR_FORM.pdf")
 */
router.get('/pdf/:fileName', (req, res) => {
    try {
        const fileName = req.params.fileName;

        // Security: Only allow PDF files and prevent directory traversal
        if (!fileName.endsWith('.pdf') || fileName.includes('..') || fileName.includes('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file name'
            });
        }

        // Check if file is in available PDFs list
        if (!availablePDFs.includes(fileName)) {
            return res.status(404).json({
                success: false,
                message: 'PDF document not found',
                availablePDFs: availablePDFs
            });
        }

        const pdfPath = path.join(publicFolder, fileName);

        // Double-check file exists (in case of race condition)
        if (!fs.existsSync(pdfPath)) {
            availablePDFs = scanForPDFs(); // Re-scan
            return res.status(404).json({
                success: false,
                message: 'PDF document not found'
            });
        }

        // Read PDF file and convert to base64
        const pdfBuffer = fs.readFileSync(pdfPath);
        const base64PDF = pdfBuffer.toString('base64');

        res.json({
            success: true,
            data: {
                title: fileName.replace('.pdf', '').replace(/_/g, ' '),
                pdfBase64: base64PDF,
                fileName: fileName,
                mimeType: 'application/pdf',
                version: '1.0',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error retrieving PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving document',
            error: error.message
        });
    }
});

/**
 * GET /api/documents/pdf/default
 * Get the first available PDF (for auto-loading)
 */
router.get('/pdf/default', (req, res) => {
    try {
        if (availablePDFs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No PDF documents available'
            });
        }

        // Return the first PDF
        const fileName = availablePDFs[0];
        const pdfPath = path.join(publicFolder, fileName);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({
                success: false,
                message: 'Default PDF not found'
            });
        }

        const pdfBuffer = fs.readFileSync(pdfPath);
        const base64PDF = pdfBuffer.toString('base64');

        res.json({
            success: true,
            data: {
                title: fileName.replace('.pdf', '').replace(/_/g, ' '),
                pdfBase64: base64PDF,
                fileName: fileName,
                mimeType: 'application/pdf',
                version: '1.0',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error retrieving default PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving document',
            error: error.message
        });
    }
});

/**
 * GET /api/documents/:fileName
 * Get any file (image or PDF) by filename - serves raw file for Android app
 * Used by Android app to load images/PDFs for signature dialogs
 */
router.get('/:fileName', (req, res) => {
    try {
        const fileName = req.params.fileName;

        // Security: prevent directory traversal
        if (fileName.includes('..') || fileName.includes('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file name'
            });
        }

        // Check if file has a supported extension
        const ext = path.extname(fileName).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type'
            });
        }

        // Check if file is in available files list
        if (!availableFiles.includes(fileName)) {
            console.warn(`File not found in availableFiles: ${fileName}. Available: ${availableFiles.join(', ')}`);
            return res.status(404).json({
                success: false,
                message: 'File not found',
                availableFiles: availableFiles
            });
        }

        const filePath = path.join(publicFolder, fileName);

        // Double-check file exists (in case of race condition)
        if (!fs.existsSync(filePath)) {
            console.warn(`File does not exist on disk: ${filePath}`);
            availableFiles = scanForAllFiles(); // Re-scan
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Read file and send as binary
        const fileBuffer = fs.readFileSync(filePath);

        // Set appropriate content type
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') {
            contentType = 'application/pdf';
        } else if (['.png'].includes(ext)) {
            contentType = 'image/png';
        } else if (['.jpg', '.jpeg'].includes(ext)) {
            contentType = 'image/jpeg';
        } else if (ext === '.gif') {
            contentType = 'image/gif';
        } else if (ext === '.bmp') {
            contentType = 'image/bmp';
        }

        res.set('Content-Type', contentType);
        res.set('Content-Length', fileBuffer.length);
        res.send(fileBuffer);

    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving file',
            error: error.message
        });
    }
});

module.exports = router;
