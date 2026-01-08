const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Charger .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const createValidAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
    
    console.log('🔗 Connexion à MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connecté à MongoDB');
    
    // Schéma temporaire
    const MemberSchema = new mongoose.Schema({
      nom: String,
      prenom: String,
      email: String,
      phoneCode: String,
      telephone: String,
      birthYear: Number,
      age: Number,
      pays: String,
      department: String,
      commune: String,
      profession: String,
      disponibilite: String,
      motivation: String,
      password: String,
      role: String,
      status: String,
      isActive: Boolean,
      memberId: String,
      membershipNumber: String,
      dateInscription: Date,
      subscriptionDate: String,
      lastLogin: Date
    });
    
    const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
    
    // Supprimer l'ancien admin
    await Member.deleteOne({ email: 'admin@gmail.com' });
    console.log('🗑️  Ancien admin supprimé');
    
    // Générer hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const now = new Date();
    
    // Créer admin avec des valeurs VALIDES
    const admin = new Member({
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
      phoneCode: '+229',
      telephone: '00000000',
      birthYear: 1990,
      age: now.getFullYear() - 1990,
      pays: 'Bénin',
      department: 'Littoral',
      commune: 'Cotonou',
      // Utiliser une valeur valide pour profession
      profession: 'Fonctionnaire', // ou 'Entrepreneur', 'Employé', etc.
      // Valeurs valides pour disponibilite
      disponibilite: 'Temps plein',
      motivation: 'Compte administrateur principal du Mouvement Patriotique du Bénin pour la gestion des membres et du système.',
      password: hashedPassword,
      role: 'admin',
      status: 'Actif',
      isActive: true,
      memberId: 'MPB-ADMIN-001',
      membershipNumber: 'MPB-ADMIN-2024-001',
      dateInscription: now,
      subscriptionDate: now.toLocaleDateString('fr-FR'),
      lastLogin: now
    });
    
    await admin.save();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN CRÉÉ AVEC VALEURS VALIDES !');
    console.log('='.repeat(60));
    console.log('👑 IDENTIFIANTS :');
    console.log(`📧 Email    : ${admin.email}`);
    console.log(`🔑 Mot de passe : admin123`);
    console.log(`👔 Profession : ${admin.profession} (VALIDE)`);
    console.log(`⏱️  Disponibilité : ${admin.disponibilite} (VALIDE)`);
    console.log('='.repeat(60));
    
    // Vérifier
    const savedAdmin = await Member.findOne({ email: 'admin@gmail.com' });
    console.log('✅ Admin enregistré avec succès');
    console.log(`📊 ID: ${savedAdmin._id}`);
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('💡 Détails:', error.errors || error);
    process.exit(1);
  }
};

createValidAdmin();