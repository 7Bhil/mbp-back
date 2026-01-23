const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Charger .env depuis le dossier parent
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Modèle Member
const Member = require('../models/Member');

const createAdminAccount = async () => {
  try {
    // Vérifier les variables d'environnement
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';

    console.log('🔗 Connexion à MongoDB...');
    console.log('📊 URI:', MONGODB_URI);

    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI non défini dans .env');
      process.exit(1);
    }

    // Connexion MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connecté à MongoDB pour création admin');

    // Vérifier si l'admin existe déjà
    const existingAdmin = await Member.findOne({ email: 'admin@gmail.com' });

    if (existingAdmin) {
      console.log('⚠️  Compte admin existe déjà');

      // Mettre à jour le rôle si nécessaire
      if (existingAdmin.role === 'super_admin') {
        existingAdmin.role = 'admin';
        existingAdmin.permissions = ['view_members', 'edit_members', 'create_events'];
        await existingAdmin.save();
        console.log('✅ Rôle admin corrigé de super_admin vers admin');
      }

      console.log('👑 Admin existant:');
      console.log('- Email:', existingAdmin.email);
      console.log('- Rôle:', existingAdmin.role);
      console.log('- ID:', existingAdmin._id);

      mongoose.connection.close();
      process.exit(0);
    }

    // Créer le hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Créer l'admin
    const admin = new Member({
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
      phoneCode: '+229',
      telephone: '00000000',
      birthYear: 1990,
      age: 34,
      pays: 'Bénin',
      department: 'Littoral',
      commune: 'Cotonou',
      profession: 'Administrateur',
      disponibilite: 'Temps plein',
      motivation: 'Compte administrateur système du Mouvement Patriotique du Bénin',
      password: hashedPassword,
      role: 'admin',
      permissions: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings'],
      status: 'Actif',
      isActive: true,
      memberId: 'MPB-ADMIN-001',
      membershipNumber: 'MPB-ADMIN-2024-001',
      subscriptionDate: new Date().toLocaleDateString('fr-FR')
    });

    await admin.save();

    console.log('\n🎉 ==========================================');
    console.log('✅ COMPTE ADMINISTRATEUR CRÉÉ AVEC SUCCÈS !');
    console.log('==========================================');
    console.log('👑 CRÉDENTIALS ADMIN:');
    console.log('- Email: admin@gmail.com');
    console.log('- Mot de passe: admin123');
    console.log('- Téléphone: +229 00 00 00 00');
    console.log('- Rôle: super_admin');
    console.log('- Permissions: Toutes');
    console.log('==========================================');
    console.log('⚠️  IMPORTANT: Changez ces identifiants après première connexion !');
    console.log('==========================================\n');

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur création admin:', error.message);

    // Suggestions de dépannage
    console.log('\n🔧 SOLUTIONS POSSIBLES:');
    console.log('1. Vérifiez que MongoDB est démarré: sudo systemctl status mongod');
    console.log('2. Si MongoDB n\'est pas installé:');
    console.log('   - Installer: sudo apt install mongodb');
    console.log('   - Démarrer: sudo systemctl start mongod');
    console.log('3. Vérifiez le fichier .env à la racine de server/');
    console.log('4. Contenu attendu de .env:');
    console.log('   PORT=5000');
    console.log('   MONGODB_URI=mongodb://localhost:27017/mpb_db');

    process.exit(1);
  }
};

// Exécuter
createAdminAccount();