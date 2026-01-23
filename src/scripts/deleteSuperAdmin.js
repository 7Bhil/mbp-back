const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Member = require('../models/Member');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

const deleteSuperAdmin = async () => {
    try {
        // Connexion DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📡 Connecté à MongoDB pour suppression...');

        const email = 'superadmin@mpb.com';

        const result = await Member.deleteOne({ email });

        if (result.deletedCount > 0) {
            console.log(`✅ Utilisateur ${email} supprimé de la base de données.`);
        } else {
            console.log(`⚠️ Aucun utilisateur trouvé avec l'email ${email}.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la suppression :', error);
        process.exit(1);
    }
};

deleteSuperAdmin();
