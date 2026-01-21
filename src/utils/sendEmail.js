const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        console.log(`📧 Tentative d'envoi d'email via service: gmail (${process.env.SMTP_EMAIL ? process.env.SMTP_EMAIL.substring(0, 3) + '...' : 'NON DEFINI'})`);
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true pour le port 465, false pour 587
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true
        });

        const message = {
            from: `${process.env.FROM_NAME || 'MPB'} <${process.env.SMTP_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html,
        };

        const info = await transporter.sendMail(message);
        console.log('✅ Message envoyé: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Erreur d\'envoi d\'email:', error);
        throw error;
    }
};

module.exports = sendEmail;
