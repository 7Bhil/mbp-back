const Member = require('../models/Member');
const PendingMember = require('../models/PendingMember');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret_change_me', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

exports.register = async (req, res) => {
  try {
    const memberData = req.body;

    // Vérifier si l'email existe déjà dans Member
    const existingMember = await Member.findOne({ email: memberData.email });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Créer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Stocker dans PendingMember (le mot de passe sera haché par le modèle Member lors du transfert final)
    await PendingMember.findOneAndUpdate(
      { email: memberData.email },
      { ...memberData, verificationToken },
      { upsert: true, new: true }
    );

    // Envoyer l'email en arrière-plan (non-bloquant)
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

    const htmlMessage = `
      <h1>Bienvenue au MPB !</h1>
      <p>Veuillez confirmer votre email en cliquant sur le lien ci-dessous :</p>
      <a href="${verifyUrl}" style="background:#003366;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Confirmer mon inscription</a>
      <p>Si le bouton ne fonctionne pas, copiez ce lien : ${verifyUrl}</p>
    `;

    // Lancement de l'envoi d'email sans attendre (await) la réponse
    sendEmail({
      email: memberData.email,
      subject: 'Confirmation d\'inscription - MPB',
      html: htmlMessage
    }).then(() => {
      console.log(`✅ Email de confirmation envoyé avec succès à ${memberData.email}`);
    }).catch(err => {
      console.error(`❌ Échec de l'envoi d'email à ${memberData.email}:`, err);
      // Optionnel: on pourrait ici marquer le membre pour un renvoi ultérieur ou logger plus de détails
    });

    // Réponse immédiate au client
    return res.status(200).json({
      success: true,
      message: 'Inscription reçue. Un email de confirmation vous a été envoyé.'
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const pending = await PendingMember.findOne({ verificationToken: token });

    if (!pending) {
      // Déjà vérifié ?
      const alreadyVerified = await Member.findOne({ verificationToken: token });
      if (alreadyVerified) {
        return res.json({ success: true, message: 'Email déjà vérifié' });
      }
      return res.status(400).json({ success: false, message: 'Lien invalide ou expiré' });
    }

    // Transférer vers Member
    const member = new Member({
      nom: pending.nom,
      prenom: pending.prenom,
      email: pending.email,
      age: pending.age,
      code_telephone: pending.code_telephone,
      telephone: pending.telephone,
      pays: pending.pays,
      departement: pending.departement,
      commune: pending.commune,
      profession: pending.profession,
      disponibilite: pending.disponibilite,
      motivation: pending.motivation,
      engagement_valeurs_mpb: pending.engagement_valeurs_mpb,
      consentement_donnees: pending.consentement_donnees,
      password: pending.password, // Déjà hashé
      isVerified: true,
      verificationToken: token,
      status: 'Actif'
    });

    await member.save();

    // Supprimer du pending
    await PendingMember.deleteOne({ _id: pending._id });

    res.json({ success: true, message: 'Compte activé avec succès' });

  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password, loginType, code_telephone, phoneNumber } = req.body;

    console.log('\n🔐 ===== DÉBUT CONNEXION =====');
    console.log('📥 Données reçues:', {
      identifier,
      loginType,
      passwordLength: password ? password.length : 0
    });

    if (!password) {
      console.log('❌ Mot de passe manquant');
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est requis'
      });
    }

    let member;

    if (loginType === 'email') {
      // Recherche par email
      const emailToFind = identifier.toLowerCase().trim();
      console.log('🔍 Recherche email:', emailToFind);

      member = await Member.findOne({ email: emailToFind });

      if (member) {
        console.log('✅ Membre trouvé:');
        console.log('   📧 Email:', member.email);
        console.log('   👤 Nom:', member.nom, member.prenom);
        console.log('   🎯 Rôle:', member.role);
        console.log('   🔑 Password hash présent:', member.password ? 'OUI' : 'NON');
        console.log('   📍 Département:', member.departement);
      } else {
        console.log('❌ Aucun membre avec cet email');
      }
    }

    if (!member) {
      console.log('❌ Aucun membre trouvé');
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    console.log('🔐 Comparaison mot de passe...');

    // VÉRIFICATION MANUELLE (debug)
    console.log('   - Password fourni:', password);
    console.log('   - Password hash en DB:', member.password ? 'présent' : 'absent');
    console.log('   - Longueur hash:', member.password ? member.password.length : 0);

    // Vérifier le mot de passe
    const isValid = await member.comparePassword(password);
    console.log('   - Résultat comparaison:', isValid ? '✅ OK' : '❌ ÉCHEC');

    if (!isValid) {
      console.log('❌ Mot de passe incorrect');
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Mettre à jour lastLogin
    member.lastLogin = new Date();
    await member.save();

    // Générer le token
    const token = generateToken(member._id);

    console.log('✅ Connexion réussie pour:', member.email);
    console.log('🔐 ===== FIN CONNEXION =====\n');

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      member: member.toJSON()
    });

  } catch (error) {
    console.error('🔥 Erreur détaillée dans login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Vérifier un token
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_change_me');
    const member = await Member.findById(decoded.id).select('-password');

    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    res.json({
      success: true,
      member
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Changer le mot de passe
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_change_me');
    const member = await Member.findById(decoded.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérifier l'ancien mot de passe
    const isValid = await member.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    member.password = newPassword;
    await member.save();

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Déconnexion
exports.logout = async (req, res) => {
  try {
    // Dans une implémentation plus avancée, vous pourriez invalider le token
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Test direct de l'email
exports.testEmail = async (req, res) => {
  try {
    console.log('🧪 Début test email production...');
    const info = await sendEmail({
      email: process.env.SMTP_EMAIL,
      subject: 'Test Production MPB',
      message: 'Si vous lisez ceci, la configuration SMTP en production est correcte.'
    });

    res.json({
      success: true,
      message: 'Email de test envoyé avec succès',
      info: info
    });
  } catch (error) {
    console.error('🔥 Erreur test email production:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'envoi du mail de test',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
