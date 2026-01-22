const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// URL SECRÈTE POUR INITIALISER LE SUPER ADMIN
// À utiliser une seule fois après le déploiement
router.get('/init-super-admin', async (req, res) => {
    try {
        const superAdminEmail = 'superadmin@mpb.com';
        const superAdminPassword = 'superadmin123456'; // Sera hashé par le modèle

        // Vérifier si existe déjà
        const existing = await Member.findOne({ email: superAdminEmail });

        if (existing) {
            if (existing.role !== 'super_admin') {
                existing.role = 'super_admin';
                await existing.save();
                return res.json({ success: true, message: 'Compte existant mis à jour en Super Admin.' });
            }
            return res.json({ success: true, message: 'Le Super Admin existe déjà.' });
        }

        // Création
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
            motivation: 'Administrateur Suprême',
            engagement_valeurs_mpb: true,
            consentement_donnees: true,
            isActive: true,
            status: 'Actif',
            profileCompleted: true,
            ville: 'QG',
            section: 'Command Center',
            centres_interet_competences: 'Administration'
        });

        await superAdmin.save();

        res.json({
            success: true,
            message: '✅ Super Admin créé avec succès !',
            credentials: {
                email: superAdminEmail,
                password: 'superadmin123456'
            }
        });

    } catch (error) {
        console.error('Erreur init:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
