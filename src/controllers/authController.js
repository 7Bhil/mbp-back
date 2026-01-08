const Member = require('../models/Member');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
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
    const { identifier, password, loginType, phoneCode, phoneNumber } = req.body;
    
    console.log('🔐 Tentative de connexion:', { identifier, loginType });
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est requis'
      });
    }
    
    let member;
    
    if (loginType === 'email') {
      // Recherche par email
      member = await Member.findOne({ email: identifier.toLowerCase() });
      console.log('👤 Membre trouvé par email:', member ? 'OUI' : 'NON');
    } else {
      // Recherche par téléphone
      if (!phoneCode || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Le code pays et le numéro sont requis'
        });
      }
      
      // Nettoyer le numéro
      const cleanNumber = phoneNumber.replace(/[\s\-\.]/g, '');
      
      // Recherche approximative
      const members = await Member.find({ 
        phoneCode,
        telephone: { $regex: cleanNumber }
      });
      
      member = members[0];
      console.log('👤 Membre trouvé par téléphone:', member ? 'OUI' : 'NON');
    }
    
    if (!member) {
      console.log('❌ Aucun membre trouvé');
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }
    
    console.log('👤 Détails membre trouvé:');
    console.log('- Email:', member.email);
    console.log('- ID:', member._id);
    console.log('- Rôle:', member.role);
    
    // Vérifier le mot de passe
    const isValid = await member.comparePassword(password);
    console.log('🔐 Validation mot de passe:', isValid ? 'OK' : 'ÉCHEC');
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }
    
    // Mettre à jour lastLogin
    member.lastLogin = new Date();
    await member.save();
    
    // Générer le token (assurez-vous que JWT_SECRET est défini dans .env)
    const token = jwt.sign({ id: member._id }, process.env.JWT_SECRET || 'default_secret_change_me', {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
    
    console.log('✅ Connexion réussie pour:', member.email);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      member: member.toJSON()
    });
    
  } catch (error) {
    console.error('🔥 Erreur détaillée dans login:', error);
    console.error('🔥 Stack:', error.stack);
    
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
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
