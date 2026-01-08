const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const createAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
    
    console.log('🔗 Connexion à MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connecté à MongoDB');
    
    // Vérifier si admin existe déjà
    const Member = mongoose.models.Member || mongoose.model('Member', new mongoose.Schema({
      email: String,
      password: String,
      role: String
    }));
    
    const existingAdmin = await Member.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      console.log('👑 Admin existe déjà');
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Rôle mis à jour');
    } else {
      // Créer le hash du mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Créer l'admin
      const admin = new Member({
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        nom: 'Admin',
        prenom: 'System'
      });
      
      await admin.save();
      console.log('\n🎉 COMPTE ADMIN CRÉÉ !');
      console.log('Email: admin@gmail.com');
      console.log('Mot de passe: admin123');
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

createAdmin();
