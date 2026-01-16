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
    
    // Calculer les champs manquants pour le profil
    const missingFields = [];
    if (!member.ville || member.ville.trim() === '') missingFields.push('ville');
    if (!member.ville_mobilisation || member.ville_mobilisation.trim() === '') missingFields.push('ville_mobilisation');
    if (!member.section || member.section.trim() === '') missingFields.push('section');
    if (!member.centres_interet_competences || member.centres_interet_competences.trim() === '') {
      missingFields.push('centres_interet_competences');
    }
    
    const profileStatus = {
      completed: member.profileCompleted,
      missingFields,
      progress: Math.round((4 - missingFields.length) / 4 * 100)
    };
    
    res.json({
      success: true,
      member,
      profileStatus
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
    const forbiddenUpdates = ['email', 'password', 'memberId', 'dateInscription', 'role'];
    forbiddenUpdates.forEach(field => delete updates[field]);
    
    // Si on met à jour les champs post-connexion, vérifier si le profil devient complet
    const postLoginFields = ['ville', 'ville_mobilisation', 'section', 'centres_interet_competences'];
    const hasPostLoginUpdate = postLoginFields.some(field => updates[field] !== undefined);
    
    const member = await Member.findByIdAndUpdate(
      req.memberId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    // Si mise à jour des champs post-connexion, vérifier le profil
    if (hasPostLoginUpdate) {
      const isProfileCompleted = postLoginFields.every(field => 
        member[field] && member[field].trim() !== ''
      );
      
      if (member.profileCompleted !== isProfileCompleted) {
        member.profileCompleted = isProfileCompleted;
        await member.save();
      }
    }
    
    // Calculer les champs manquants
    const missingFields = [];
    if (!member.ville || member.ville.trim() === '') missingFields.push('ville');
    if (!member.ville_mobilisation || member.ville_mobilisation.trim() === '') missingFields.push('ville_mobilisation');
    if (!member.section || member.section.trim() === '') missingFields.push('section');
    if (!member.centres_interet_competences || member.centres_interet_competences.trim() === '') {
      missingFields.push('centres_interet_competences');
    }
    
    const profileStatus = {
      completed: member.profileCompleted,
      missingFields,
      progress: Math.round((4 - missingFields.length) / 4 * 100)
    };
    
    res.json({
      success: true,
      message: member.profileCompleted ? '✅ Profil complété avec succès!' : '📝 Profil mis à jour',
      member,
      profileStatus
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const { ville, ville_mobilisation, section, centres_interet_competences } = req.body;
    
    // Vérifier que tous les champs sont fournis
    if (!ville || !ville_mobilisation || !section || !centres_interet_competences) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis pour compléter le profil'
      });
    }
    
    const updates = {
      ville,
      ville_mobilisation,
      section,
      centres_interet_competences,
      profileCompleted: true
    };
    
    const member = await Member.findByIdAndUpdate(
      req.memberId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: '✅ Profil complété avec succès!',
      member,
      profileStatus: {
        completed: true,
        missingFields: [],
        progress: 100
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la complétion du profil',
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

exports.getProfileStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    // Quels champs manquent ?
    const missingFields = [];
    if (!member.ville || member.ville.trim() === '') missingFields.push('ville');
    if (!member.ville_mobilisation || member.ville_mobilisation.trim() === '') missingFields.push('ville_mobilisation');
    if (!member.section || member.section.trim() === '') missingFields.push('section');
    if (!member.centres_interet_competences || member.centres_interet_competences.trim() === '') {
      missingFields.push('centres_interet_competences');
    }
    
    res.json({
      success: true,
      profileCompleted: member.profileCompleted,
      missingFields,
      progress: Math.round((4 - missingFields.length) / 4 * 100)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};