const Member = require('../models/Member');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret_change_me', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

exports.register = async (req, res) => {
  try {
    const memberData = req.body;
    
    // Vérifier si l'email existe
    const existingMember = await Member.findOne({ email: memberData.email });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }
    
    // Créer le membre
    const member = new Member(memberData);
    await member.save();
    
    // Générer le token
    const token = generateToken(member._id);
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      member: member.toJSON()
    });
    
  } catch (error) {
    console.error('Erreur inscription:', error);
    
    // Gestion des erreurs de validation MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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