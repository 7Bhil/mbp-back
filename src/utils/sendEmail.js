const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        console.log(`📧 Tentative d'envoi d'email via Gmail SMTP (${options.email})`);

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 465,
            secure: true, // true pour le port 465, false pour les autres
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'Mouvement Patriotique du Bénin'}" <${process.env.SMTP_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            html: options.html || options.message,
            text: options.message // Version texte brut si nécessaire
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email envoyé via SMTP Gmail (ID: %s)', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Erreur d\'envoi d\'email SMTP Gmail:', error.message);
        throw error;
    }
};

module.exports = sendEmail;
