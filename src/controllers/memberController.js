const Member = require('../models/Member');

exports.getProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.memberId).select('-password');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    res.json({
      success: true,
      member
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Empêcher la mise à jour de certains champs
    const forbiddenUpdates = ['email', 'password', 'memberId', 'membershipNumber', 'dateInscription'];
    forbiddenUpdates.forEach(field => delete updates[field]);
    
    const member = await Member.findByIdAndUpdate(
      req.memberId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Profil mis à jour',
      member
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().select('-password').sort('-dateInscription');
    
    res.json({
      success: true,
      count: members.length,
      members
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
