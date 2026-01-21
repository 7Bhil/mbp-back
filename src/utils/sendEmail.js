const axios = require('axios');

const sendEmail = async (options) => {
    try {
        console.log(`📧 Tentative d'envoi d'email via API Brevo (${options.email})`);

        const data = {
            sender: {
                name: process.env.FROM_NAME || "Mouvement Patriotique du Bénin",
                email: process.env.SMTP_EMAIL || "louerleternel123@gmail.com"
            },
            to: [{ email: options.email }],
            subject: options.subject,
            htmlContent: options.html || options.message
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASSWORD, // On utilise la clé API stockée dans SMTP_PASSWORD
                'content-type': 'application/json'
            }
        });

        console.log('✅ Email envoyé via API (ID: %s)', response.data.messageId);
        return response.data;
    } catch (error) {
        console.error('❌ Erreur d\'envoi d\'email API:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = sendEmail;
