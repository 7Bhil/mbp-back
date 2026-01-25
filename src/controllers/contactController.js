const Contact = require('../models/Contact');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Soumettre un message de contact
 * @route   POST /api/contact
 * @access  Public
 */
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // 1. Créer le message en base de données
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message
    });

    // 2. Préparer l'email pour l'administrateur
    const adminEmail = process.env.SMTP_EMAIL || "mouvementpatriotique229@outlook.com";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Nouveau Message de Contact</h1>
        </div>
        <div style="padding: 20px;">
          <p>Vous avez reçu un nouveau message via le formulaire de contact du site MPB.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>De :</strong> ${name} (&lt;${email}&gt;)</p>
            <p><strong>Téléphone :</strong> ${phone || 'Non renseigné'}</p>
            <p><strong>Sujet :</strong> ${subject}</p>
          </div>
          <div style="border-left: 4px solid #003366; padding-left: 15px; margin-bottom: 20px; font-style: italic;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="font-size: 0.9em; color: #666;">Ce message a été envoyé le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 0.8em; color: #888;">
          © Mouvement Patriotique du Bénin
        </div>
      </div>
    `;

    // 3. Envoyer l'email
    try {
      await sendEmail({
        email: adminEmail,
        subject: `[Contact MPB] ${subject} - de ${name}`,
        html: emailHtml
      });
    } catch (emailError) {
      console.error('⚠️ Erreur d\'envoi d\'email de notification:', emailError.message);
      // On ne bloque pas la réponse si l'email échoue, car le message est déjà en DB
    }

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur soumission contact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message',
      error: error.message
    });
  }
};

/**
 * @desc    Récupérer tous les messages (Admin seulement)
 * @route   GET /api/contact
 * @access  Private/Admin
 */
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages'
    });
  }
};

/**
 * @desc    Marquer un message comme lu
 * @route   PATCH /api/contact/:id/read
 * @access  Private/Admin
 */
exports.markAsRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: 'lu' },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

/**
 * @desc    Supprimer un message
 * @route   DELETE /api/contact/:id
 * @access  Private/Admin
 */
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};
