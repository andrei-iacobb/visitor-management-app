const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create PDF document
const pdfPath = path.join(__dirname, '../public/VISITOR_SAFETY_REQUIREMENTS.pdf');
const doc = new PDFDocument({
  size: 'letter',
  margin: 40
});

// Pipe to file
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

// Color scheme
const primaryColor = '#1A237E';

// Set default font
doc.font('Helvetica');

// Title
doc.fontSize(16)
  .fillColor(primaryColor)
  .text('VISITOR & CONTRACTOR SAFETY REQUIREMENTS', { align: 'center' })
  .moveDown(0.3);

doc.fontSize(10)
  .fillColor('black')
  .text('Important: All contractors must be authorised and must have submitted all required documents before commencing work.', {
    align: 'center',
    width: 500,
    italics: true
  })
  .moveDown(0.5);

// Function to add section
function addSection(title, content) {
  doc.fontSize(11)
    .fillColor(primaryColor)
    .text(title, { underline: true })
    .moveDown(0.2);

  doc.fontSize(9)
    .fillColor('black')
    .text(content, {
      align: 'left',
      width: 500,
      lineGap: 3
    })
    .moveDown(0.4);
}

// Asbestos
addSection('ASBESTOS', `There are no asbestos containing materials identified on site, however it is presumed there is asbestos present in the high-level ceiling and lift shaft. Any work that could affect and disturb asbestos containing materials must have authority from the Compliance Department before beginning any work. Contractors must view the organisation's Asbestos Survey before commencing work, available at reception.`);

// Electrical Vehicles
addSection('ELECTRICAL VEHICLES', `Any works completed on electrical vehicles must be carried under supervision by one of our trained EV technicians. Please inform us immediately if you have a pacemaker fitted prior to commencing works on EVs.`);

// Emergency Responses
addSection('EMERGENCY RESPONSES', `All spills must be cleared up immediately and waste disposed of in compliance with local waste regulations.`);

// Fire Precautions
addSection('FIRE PRECAUTIONS', `The Fire Alarm is used in the event of an emergency. Any person who discovers a fire should sound the nearest alarm. On hearing the Fire Alarm leave the building by the nearest exit and proceed for roll call to the Assembly Point, which is located at the front entrance gate. Do not stop to collect personal belongings.`);

// First Aid
addSection('FIRST AID', `Trained First Aiders are available on site. A First Aider can be found at the reception.`);

// Hazardous Substances
addSection('HAZARDOUS SUBSTANCES', `Contractors must ensure any hazardous substances used on site are stored, handled and disposed of in a safe manner.`);

// Permit to Work
addSection('PERMIT TO WORK', `The following 'high risk' activities are subject to a permit to work: Hot work, demolition, excavation, asbestos, confined spaces, electrical work, work at height, other specified work.`);

// PPE
addSection('PERSONAL PROTECTIVE EQUIPMENT (PPE)', `Suitable Personal Protective Equipment shall be worn when necessary in line with Contractor's risk assessment and must be properly maintained. A clearly visible hi-vis to be worn at all times while onsite, excluding office areas.`);

// Reporting Issues
addSection('REPORTING ISSUES', `All accidents, incidents and near misses must be reported immediately to Reception who will forward it to our Compliance Department.`);

// Restrictions to Workshop
addSection('RESTRICTIONS TO THE WORKSHOP', `You must not enter the workshop under any circumstances unless authorised by Service Manager.`);

// Signing Out
addSection('SIGNING OUT', `You must sign out when leaving the site, regardless of the reason. Upon completion of work, ensure the work area is left in a safe and tidy condition. You must also sign in and out whenever leaving the site temporarily e.g. when leaving site for breaks.`);

// Smoking & Vaping
addSection('SMOKING & VAPING', `Smoking and vaping are only permitted in designated areas. The smoking area is sign posted at the front of reception. Please dispose of extinguished cigarettes in ashtrays provided.`);

// Toilets
addSection('TOILETS', `Toilets with hand washing facilities are provided. Please use the toilet located in waiting room at Service reception.`);

// Vehicle Movements
addSection('VEHICLE MOVEMENTS', `Please be aware of vehicle and people movements on site. You must not cause obstruction to others. The speed limit on site is 10 mph.`);

// Waste Management
addSection('WASTE MANAGEMENT', `Contractors are responsible for the removal of their own waste unless authorised by Chassis Cab to use their segregated waste streams.`);

// Work Area
addSection('WORK AREA', `Your work area must always be kept in a clean and safe manner.`);

// Add some space before signature section
doc.moveDown(0.5);

// Signature section
doc.fontSize(10)
  .fillColor('black')
  .text('ACKNOWLEDGMENT OF SAFETY REQUIREMENTS', { underline: true })
  .moveDown(0.3);

doc.fontSize(9)
  .fillColor('black')
  .text('I acknowledge that I have read, understood, and agree to comply with all the safety requirements outlined in this document during my visit/work on this site.', {
    width: 500,
    lineGap: 2
  })
  .moveDown(0.5);

doc.fontSize(9)
  .fillColor('black')
  .text('Visitor/Contractor Name (Print): ___________________________________________', { indent: 0 })
  .moveDown(0.4)
  .text('Signature: ___________________________________________     Date: ______________', { indent: 0 })
  .moveDown(0.3)
  .text('Time: ______________', { indent: 0 })
  .moveDown(0.5);

doc.fontSize(9)
  .fillColor('black')
  .text('Staff Witness Name (Print): ___________________________________________', { indent: 0 })
  .moveDown(0.3)
  .text('Staff Witness Signature: ___________________________________________', { indent: 0 });

// Finalize PDF
doc.end();

// Handle completion
stream.on('finish', () => {
  console.log(`✓ Safety requirements PDF created: ${pdfPath}`);
  console.log(`File size: ${fs.statSync(pdfPath).size} bytes`);
});

stream.on('error', (err) => {
  console.error(`Error creating PDF: ${err}`);
  process.exit(1);
});
