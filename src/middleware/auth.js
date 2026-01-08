const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const member = await Member.findById(decoded.id);
    
    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    req.memberId = member._id;
    req.member = member;
    next();
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
