const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create PDF document
const pdfPath = path.join(__dirname, '../public/VISITOR_ACKNOWLEDGMENT_FORM.pdf');
const doc = new PDFDocument({
  size: 'letter',
  margin: 50
});

// Pipe to file
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

// Color scheme
const primaryColor = '#1A237E';
const accentColor = '#D32F2F';

// Set default font
doc.font('Helvetica');

// Title
doc.fontSize(18)
  .fillColor(primaryColor)
  .text('VISITOR ACKNOWLEDGMENT FORM', { align: 'center' })
  .moveDown();

// Spacing
doc.fontSize(11)
  .fillColor('black')
  .text('Welcome to our facility. Before you enter, please read and acknowledge this important information.', {
    align: 'left',
    width: 500
  })
  .moveDown(0.5);

// Function to add section
function addSection(title, items) {
  doc.fontSize(12)
    .fillColor(primaryColor)
    .text(title, { underline: true })
    .moveDown(0.3);

  items.forEach(item => {
    doc.fontSize(10)
      .fillColor('black')
      .text(item, { indent: 20, width: 480 })
      .moveDown(0.15);
  });

  doc.moveDown(0.3);
}

// Section 1: Security and Safety
addSection('1. SECURITY AND SAFETY', [
  '• All visitors must comply with facility security procedures',
  '• Wear your visitor badge at all times while on premises',
  '• Report any security concerns to staff immediately'
]);

// Section 2: Health and Safety
addSection('2. HEALTH AND SAFETY', [
  '• In case of emergency, follow staff instructions',
  '• Emergency exits are clearly marked throughout the facility',
  '• Know the location of the nearest fire extinguisher and first aid kit'
]);

// Section 3: Confidentiality
addSection('3. CONFIDENTIALITY', [
  '• Do not photograph or record any part of the facility without permission',
  '• Do not discuss proprietary information or business details seen during your visit',
  '• Confidential information must remain confidential even after your visit'
]);

// Section 4: Conduct
addSection('4. CONDUCT', [
  '• Treat all staff and other visitors with respect',
  '• No harassment, discrimination, or inappropriate behavior',
  '• Report any incidents or concerns to staff immediately'
]);

// Section 5: Facility Rules
addSection('5. FACILITY RULES', [
  '• Follow all posted signs and instructions',
  '• Do not remove any items from the facility without authorization',
  '• Respect restricted areas marked as "No Entry"'
]);

// Section 6: Parking
addSection('6. PARKING', [
  '• Use designated visitor parking areas only',
  '• Do not block access roads or emergency exits',
  '• Ensure your vehicle is locked at all times'
]);

// Section 7: Liability
addSection('7. LIABILITY', [
  '• The facility is not responsible for lost, stolen, or damaged personal items',
  '• You assume all risks associated with your visit',
  '• The facility reserves the right to refuse entry or ask visitors to leave'
]);

// Closing statement
doc.fontSize(10)
  .fillColor('black')
  .text('By signing in, you acknowledge that you have read and understand these rules and agree to comply with them during your visit.', {
    align: 'left',
    width: 500
  })
  .moveDown(0.5)
  .text('Thank you for visiting. We appreciate your cooperation in maintaining a safe and secure facility.', {
    align: 'left',
    width: 500
  })
  .moveDown(1);

// Signature section
doc.fontSize(10)
  .fillColor('black')
  .text('Visitor Name (Print): ___________________________________________', { indent: 0 })
  .moveDown(0.5)
  .text('Visitor Signature: ___________________________________________     Date: ______________', { indent: 0 })
  .moveDown(0.5)
  .text('Time: ______________', { indent: 0 })
  .moveDown(1);

doc.fontSize(10)
  .fillColor('black')
  .text('Staff Name (Print): ___________________________________________', { indent: 0 })
  .moveDown(0.5)
  .text('Staff Signature: ___________________________________________', { indent: 0 });

// Finalize PDF
doc.end();

// Handle completion
stream.on('finish', () => {
  console.log(`✓ PDF created successfully: ${pdfPath}`);
  console.log(`File size: ${fs.statSync(pdfPath).size} bytes`);
});

stream.on('error', (err) => {
  console.error(`Error creating PDF: ${err}`);
  process.exit(1);
});
