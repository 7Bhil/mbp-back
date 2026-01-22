const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// URL SECRÈTE POUR INITIALISER LE SUPER ADMIN
// Utiliser ?force=true pour forcer la suppression et recréation
router.get('/init-super-admin', async (req, res) => {
    try {
        const superAdminEmail = 'superadmin@mpb.com';
        const superAdminPassword = 'superadmin123456';
        const forceRecreate = req.query.force === 'true';

        // Vérifier si existe déjà
        const existing = await Member.findOne({ email: superAdminEmail });

        if (existing) {
            if (forceRecreate) {
                console.log(`🗑️ Suppression de l'ancien compte ${existing.email} (ID: ${existing._id}) pour recréation propre...`);
                await Member.deleteOne({ _id: existing._id }); // Suppression par ID plus sûre
            } else {
                // Mise à jour simple du rôle si nécessaire
                let updated = false;
                if (existing.role !== 'super_admin') {
                    existing.role = 'super_admin';
                    updated = true;
                }

                if (updated) {
                    await existing.save();
                    return res.json({ success: true, message: 'Compte existant mis à jour en Super Admin (Rôle corrigé).' });
                }

                return res.json({
                    success: true,
                    message: 'Le Super Admin existe déjà. Le mot de passe n\'a pas été changé.',
                    hint: 'Ajoutez ?force=true à l\'URL pour supprimer et recréer ce compte à zéro (reset mot de passe).'
                });
            }
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
            message: forceRecreate
                ? '✅ Ancien compte supprimé et Super Admin RECRÉÉ avec succès !'
                : '✅ Super Admin créé avec succès !',
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
