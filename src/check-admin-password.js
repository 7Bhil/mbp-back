// check-admin-password.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function checkAdminPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mpb_db');
    console.log('✅ MongoDB connecté');
    
    const Member = require('./models/Member');
    
    const admin = await Member.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin non trouvé');
      return;
    }
    
    console.log('\n🔍 ADMIN TROUVÉ:');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password hash:', admin.password);
    console.log('📏 Longueur hash:', admin.password.length);
    
    // Tester différents mots de passe
    const testPasswords = [
      'admin123',
      'Admin123',
      'admin',
      'Admin',
      'password',
      'Password',
      '123456',
      'admin123!'
    ];
    
    console.log('\n🧪 Tests de mots de passe:');
    for (const testPassword of testPasswords) {
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log(`   "${testPassword}": ${isValid ? '✅ CORRECT' : '❌ incorrect'}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkAdminPassword();