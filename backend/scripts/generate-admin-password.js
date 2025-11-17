#!/usr/bin/env node

/**
 * Script to generate bcrypt hash for admin password
 * Usage: node generate-admin-password.js [password]
 * If no password provided, defaults to 'admin123'
 */

const bcrypt = require('bcryptjs');

// Get password from command line argument or use default
const password = process.argv[2] || 'admin123';

// Generate hash with salt rounds of 10
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error generating password hash:', err);
    process.exit(1);
  }

  console.log('✅ Password hash generated successfully!\n');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n📝 Add this to your .env file:');
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
  console.log('\n⚠️  Make sure to keep this hash secure and never commit it to version control!');
});
