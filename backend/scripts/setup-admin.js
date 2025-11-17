#!/usr/bin/env node

/**
 * Admin User Setup Script
 * Generates bcrypt hash for admin password
 *
 * Usage:
 *   node scripts/setup-admin.js [password]
 *
 * If no password provided, uses default: admin123
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Get password from command line or use default
const password = process.argv[2] || 'admin123';
const username = process.argv[3] || 'admin';

console.log('\n🔐 Admin User Setup');
console.log('==================\n');

// Generate bcrypt hash
console.log('Generating bcrypt hash...');
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log(`\n✅ Hash generated successfully!\n`);
console.log('Add these lines to your .env file:\n');
console.log('─────────────────────────────────────────────');
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('─────────────────────────────────────────────\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log('📝 .env file found\n');
  console.log('⚠️  MANUAL STEP REQUIRED:');
  console.log('   Please add the above lines to your .env file\n');
} else if (fs.existsSync(envExamplePath)) {
  console.log('⚠️  .env file not found\n');
  console.log('Please create .env file:');
  console.log(`   cp .env.example .env`);
  console.log('   Then add the above configuration lines\n');
} else {
  console.log('⚠️  Neither .env nor .env.example found\n');
  console.log('Please create .env file and add the above configuration\n');
}

// Verify the hash works
console.log('🧪 Testing hash...');
const isValid = bcrypt.compareSync(password, hash);
if (isValid) {
  console.log('✅ Hash verification successful!\n');
  console.log(`You can now login with:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}\n`);
} else {
  console.log('❌ Hash verification failed!\n');
  process.exit(1);
}

console.log('🚀 Setup complete!\n');
