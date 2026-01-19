require('dotenv').config();
const sendEmail = require('./src/utils/sendEmail');

const test = async () => {
    try {
        console.log('🧪 Test local de l\'email...');
        console.log('Fichier .env chargé.');
        console.log('Email utilisé:', process.env.SMTP_EMAIL);

        await sendEmail({
            email: process.env.SMTP_EMAIL,
            subject: 'Verification Password - MPB',
            message: 'Ceci est un test pour confirmer que votre code à 16 chiffres fonctionne bien !'
        });

        console.log('✅ SUCCÈS : L\'email a été envoyé !');
    } catch (error) {
        console.error('❌ ÉCHEC :', error.message);
        if (error.message.includes('Invalid login')) {
            console.error('CONSEIL : Votre code à 16 chiffres est probablement incorrect ou le mail est mal écrit.');
        }
    }
};

test();
