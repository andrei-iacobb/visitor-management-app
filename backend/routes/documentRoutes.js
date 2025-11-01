const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Cache for available PDFs - updated whenever files change
let availablePDFs = [];
const publicFolder = path.join(__dirname, '../public');

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
 * Initialize and watch for PDF changes
 */
function initializePDFWatcher() {
    // Initial scan
    availablePDFs = scanForPDFs();
    console.log(`✓ Found ${availablePDFs.length} PDF(s) in public folder:`, availablePDFs);

    // Watch for file changes
    try {
        fs.watch(publicFolder, (eventType, filename) => {
            if (filename && filename.toLowerCase().endsWith('.pdf')) {
                availablePDFs = scanForPDFs();
                console.log(`✓ PDFs updated (${eventType}):`, availablePDFs);
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
router.get('/default', (req, res) => {
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

module.exports = router;
