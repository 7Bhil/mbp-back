const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Member = require('../models/Member');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

const createSuperAdmin = async () => {
    try {
        // Connexion DB
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`📡 MongoDB Connecté: ${conn.connection.host}`);

        const superAdminEmail = 'superadmin@mpb.com';
        const superAdminPassword = 'superadmin123456';

        // Vérifier si le Super Admin existe déjà
        const existingSuperAdmin = await Member.findOne({ email: superAdminEmail });

        if (existingSuperAdmin) {
            console.log('⚠️ Le compte Super Admin existe déjà.');

            // Optionnel : Forcer la mise à jour du rôle si nécessaire
            if (existingSuperAdmin.role !== 'super_admin') {
                existingSuperAdmin.role = 'super_admin';
                await existingSuperAdmin.save();
                console.log('✅ Rôle mis à jour vers super_admin');
            }

            process.exit(0);
        }

        // Création du Super Admin
        const superAdmin = new Member({
            nom: 'SYSTEM',
            prenom: 'Super Admin',
            email: superAdminEmail,
            password: superAdminPassword,
            role: 'super_admin',
            age: 99,
            telephone: '+22900000000',
            pays: 'Bénin',
            departement: 'Littoral',
            commune: 'Cotonou',
            profession: 'Autre',
            disponibilite: 'Temps plein',
            motivation: 'Administrateur Suprême du Système MPB',
            engagement_valeurs_mpb: true,
            consentement_donnees: true,
            isActive: true,
            status: 'Actif',
            profileCompleted: true,
            ville: 'QG',
            section: 'Command Center'
        });

        await superAdmin.save();

        console.log(`
    🎉 SUPER ADMIN CRÉÉ AVEC SUCCÈS !
    =================================
    📧 Email: ${superAdminEmail}
    🔑 Pass : ${superAdminPassword}
    🛡️ Role : super_admin
    =================================
    `);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur création Super Admin:', error);
        process.exit(1);
    }
};

createSuperAdmin();
