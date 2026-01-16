// create-admin-fix.js
const mongoose = require('mongoose');

async function createAdminFinal() {
  try {
    console.log('🚀 CRÉATION ADMIN CORRIGÉE');
    
    // Connexion
    await mongoose.connect('mongodb://localhost:27017/mpb_db');
    console.log('✅ MongoDB connecté');
    
    // Charger modèle
    const Member = require('./models/Member');
    
    // Supprimer TOUS les anciens admins (nettoyage complet)
    await Member.deleteMany({ email: 'admin@gmail.com' });
    console.log('🗑️  Tous les anciens admins supprimés');
    
    // Données admin avec mot de passe PLAIN TEXT (8+ caractères)
    const adminData = {
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
      age: 35,
      code_telephone: '+229',
      telephone: '00000000',
      pays: 'Bénin',
      departement: 'Littoral',
      commune: 'Cotonou',
      ville: 'Cotonou',
      ville_mobilisation: 'Cotonou',
      section: 'Administration',
      centres_interet_competences: 'Gestion, Administration, Développement Web',
      profession: 'Fonctionnaire',
      disponibilite: 'Temps plein',
      motivation: 'Compte administrateur principal pour gérer les membres du Mouvement Patriotique du Bénin.',
      engagement_valeurs_mpb: true,
      consentement_donnees: true,
      password: 'admin123', // 8 CARACTÈRES - sera haché par le middleware
      role: 'admin',
      permissions: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings'],
      status: 'Actif',
      isActive: true,
      profileCompleted: true
    };
    
    console.log('🔑 Configuration:');
    console.log('   Mot de passe: admin123 (8 caractères, en clair)');
    
    // Créer l'admin avec mongoose (qui déclenchera le middleware)
    const admin = new Member(adminData);
    await admin.save();
    
    console.log('✅ Admin créé avec ID:', admin._id);
    console.log('📧 Email:', admin.email);
    console.log('🆔 Member ID:', admin.memberId);
    console.log('🔢 Membership Number:', admin.membershipNumber);
    console.log('🔐 Hash généré:', admin.password.substring(0, 30) + '...');
    console.log('🔑 Longueur hash:', admin.password.length, 'caractères');
    
    // TEST IMMÉDIAT
    console.log('\n🧪 TESTS DIRECTS:');
    
    // 1. Vérifier que l'admin existe
    const savedAdmin = await Member.findOne({ email: 'admin@gmail.com' });
    console.log('1. Admin récupéré:', !!savedAdmin);
    
    // 2. Test de comparaison du mot de passe
    const testPassword = 'admin123';
    console.log('2. Test avec mot de passe:', testPassword);
    
    // Test avec bcrypt directement
    const bcrypt = require('bcryptjs');
    console.log('   Hash en base:', savedAdmin.password.substring(0, 30) + '...');
    
    const directTest = await bcrypt.compare(testPassword, savedAdmin.password);
    console.log('   bcrypt.compare direct:', directTest ? '✅ OK' : '❌ ÉCHEC');
    
    // Test avec la méthode du modèle
    const modelTest = await savedAdmin.comparePassword(testPassword);
    console.log('   comparePassword():', modelTest ? '✅ OK' : '❌ ÉCHEC');
    
    // 3. Vérifier d'autres champs
    console.log('3. Vérification des champs:');
    console.log('   - Email:', savedAdmin.email === 'admin@gmail.com' ? '✅' : '❌');
    console.log('   - Rôle:', savedAdmin.role === 'admin' ? '✅' : '❌');
    console.log('   - Profil complété:', savedAdmin.profileCompleted ? '✅' : '❌');
    console.log('   - Mot de passe modifié:', savedAdmin.isModified('password') ? '❌' : '✅');
    
    if (directTest && modelTest) {
      console.log('\n🎉 SUCCÈS COMPLET !');
      console.log('='.repeat(50));
      console.log('CRÉDENTIALS POUR LA CONNEXION:');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Mot de passe: admin123');
      console.log('='.repeat(50));
      
      console.log('\n📋 INFOS COMPLÈTES:');
      console.log('Nom complet:', savedAdmin.prenom, savedAdmin.nom);
      console.log('Âge:', savedAdmin.age);
      console.log('Département:', savedAdmin.departement);
      console.log('Commune:', savedAdmin.commune);
      console.log('Date inscription:', savedAdmin.dateInscription);
      console.log('Status:', savedAdmin.status);
      
    } else {
      console.log('\n⚠️  Problème détecté !');
      console.log('Hash stocké:', savedAdmin.password);
      console.log('Hash attendu pour "admin123":');
      
      // Générer un hash pour voir à quoi il devrait ressembler
      const testHash = await bcrypt.hash(testPassword, 10);
      console.log('Test hash:', testHash.substring(0, 30) + '...');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}:`, error.errors[key].message);
        console.error(`     Valeur:`, error.errors[key].value);
      });
    }
    console.error('\n🔧 Stack:', error.stack);
    process.exit(1);
  }
}

createAdminFinal();