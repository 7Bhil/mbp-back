const Member = require('../models/Member');

// Vérifier si l'utilisateur est admin
exports.isAdmin = async (req, res, next) => {
  try {
    const member = await Member.findById(req.memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    if (member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Droits administrateur requis.'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification des droits'
    });
  }
};



// Middleware pour vérifier une permission spécifique
exports.hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const member = await Member.findById(req.memberId);
      
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Membre non trouvé'
        });
      }
      
      // Super_admin a toutes les permissions
      if (member.role === 'super_admin') {
        return next();
      }
      
      // Admin vérifie les permissions spécifiques
      if (member.role === 'admin' && member.permissions.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: `Permission "${permission}" requise`
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur de vérification des permissions'
      });
    }
  };
};