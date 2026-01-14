const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Charger .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const createValidAdmin = async () => {
  let connection;
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
    
    console.log('🔗 Connexion à MongoDB...');
    console.log('URI:', MONGODB_URI);
    
    // Vérifier si Mongoose est déjà connecté
    if (mongoose.connection.readyState === 0) {
      connection = await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connecté à MongoDB');
    } else {
      console.log('⚠️  Déjà connecté à MongoDB');
    }
    
    // Importer le modèle depuis le dossier src/models
    const Member = require('./src/models/Member'); // Changé pour src/models/
    
    // Supprimer l'ancien admin
    const deleteResult = await Member.deleteOne({ email: 'admin@gmail.com' });
    console.log(`🗑️  Ancien admin supprimé: ${deleteResult.deletedCount} document(s)`);
    
    // Créer admin avec des valeurs VALIDES selon le modèle
    const admin = new Member({
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
      phoneCode: '+229',
      telephone: '00000000',
      birthYear: 1990,
      pays: 'Bénin',
      department: 'Littoral', // Si pays = Bénin, requis
      commune: 'Cotonou',
      profession: 'Fonctionnaire', // Doit être dans l'énum du modèle
      disponibilite: 'Temps plein', // Doit être dans l'énum du modèle
      motivation: 'Compte administrateur principal du Mouvement Patriotique du Bénin pour la gestion des membres et du système. Cette motivation contient plus de vingt caractères pour valider.',
      password: 'admin123', // Le middleware hash automatiquement
      role: 'admin',
      status: 'Actif',
      isActive: true,
      // memberId et membershipNumber seront générés automatiquement par le middleware pre-save
      // dateInscription sera généré automatiquement
      // subscriptionDate sera généré automatiquement
    });
    
    console.log('\n📋 Tentative de création admin avec valeurs:');
    console.log('- Profession:', admin.profession, '(valide:', ['Étudiant', 'Employé', 'Fonctionnaire', 'Entrepreneur', 'Commerçant', 'Agriculteur', 'Artisan', 'Profession libérale', 'Retraité', 'Sans emploi', 'Autre'].includes(admin.profession) ? 'OUI' : 'NON', ')');
    console.log('- Disponibilité:', admin.disponibilite, '(valide:', ['Quelques heures par semaine', '1-2 jours par semaine', '3-4 jours par semaine', 'Temps plein', 'Weekends uniquement'].includes(admin.disponibilite) ? 'OUI' : 'NON', ')');
    console.log('- Longueur motivation:', admin.motivation.length, 'caractères (minimum 20)');
    
    // Valider manuellement avant sauvegarde
    try {
      await admin.validate();
      console.log('✅ Validation du schéma réussie');
    } catch (validationError) {
      console.error('❌ Erreur de validation:', validationError.message);
      console.error('Détails:', validationError.errors);
      throw validationError;
    }
    
    // Sauvegarder
    const savedAdmin = await admin.save();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN CRÉÉ AVEC SUCCÈS !');
    console.log('='.repeat(60));
    console.log('👑 IDENTIFIANTS :');
    console.log(`📧 Email: ${savedAdmin.email}`);
    console.log(`🔑 Mot de passe: admin123`);
    console.log(`👔 Profession: ${savedAdmin.profession}`);
    console.log(`⏱️  Disponibilité: ${savedAdmin.disponibilite}`);
    console.log(`🆔 Member ID: ${savedAdmin.memberId}`);
    console.log(`#️⃣ Membership Number: ${savedAdmin.membershipNumber}`);
    console.log(`🎯 Rôle: ${savedAdmin.role}`);
    console.log('='.repeat(60));
    
    // Vérifier la création
    const verifyAdmin = await Member.findOne({ email: 'admin@gmail.com' });
    if (verifyAdmin) {
      console.log('\n✅ Admin vérifié dans la base de données');
      console.log(`📊 ID MongoDB: ${verifyAdmin._id}`);
      console.log(`👤 Nom complet: ${verifyAdmin.prenom} ${verifyAdmin.nom}`);
      console.log(`📅 Date inscription: ${verifyAdmin.dateInscription}`);
      console.log(`📞 Téléphone: ${verifyAdmin.phoneCode} ${verifyAdmin.telephone}`);
      console.log(`📍 Localisation: ${verifyAdmin.commune}, ${verifyAdmin.department}, ${verifyAdmin.pays}`);
    } else {
      console.log('❌ ERREUR: Admin non trouvé après création');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:');
    console.error('Message:', error.message);
    console.error('Nom:', error.name);
    
    // Afficher les erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      console.error('\n🔍 Erreurs de validation détaillées:');
      for (const field in error.errors) {
        console.error(`- ${field}: ${error.errors[field].message}`);
        console.error(`  Valeur: ${error.errors[field].value}`);
      }
    }
    
    // Afficher les erreurs de duplication
    if (error.name === 'MongoError' && error.code === 11000) {
      console.error('❌ Erreur de duplication (champ unique déjà existant)');
    }
    
    process.exit(1);
  } finally {
    // Attendre un peu avant de fermer
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log('\n🔌 Connexion MongoDB fermée');
        }
        process.exit(0);
      } catch (closeError) {
        console.error('Erreur fermeture connexion:', closeError.message);
        process.exit(1);
      }
    }, 3000);
  }
};

// Exécuter le script
createValidAdmin();