require('dotenv').config();
const axios = require('axios');

const testApi = async () => {
    try {
        console.log('🧪 Test API Brevo...');
        console.log('Email utilisé (Expéditeur):', process.env.SMTP_EMAIL);

        const data = {
            sender: {
                name: "Mouvement Patriotique du Bénin",
                email: process.env.SMTP_EMAIL
            },
            to: [{ email: process.env.SMTP_EMAIL }],
            subject: "Test API Brevo",
            htmlContent: "Si vous recevez ceci, l'API fonctionne !"
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASSWORD,
                'content-type': 'application/json'
            }
        });

        console.log('✅ SUCCÈS API ! ID:', response.data.messageId);
    } catch (error) {
        console.error('❌ ÉCHEC API :', error.response ? error.response.status : error.message);
        if (error.response && error.response.data) {
            console.error('Détails :', JSON.stringify(error.response.data, null, 2));
        }
    }
};

testApi();
