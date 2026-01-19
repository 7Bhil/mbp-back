const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            }
        });

        const message = {
            from: `${process.env.FROM_NAME} <${process.env.SMTP_EMAIL}>`,
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
