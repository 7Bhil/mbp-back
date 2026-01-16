const Member = require('../models/Member');

exports.completeProfile = async (req, res) => {
  try {
    const { ville, ville_mobilisation, section, centres_interet_competences } = req.body;
    
    const member = await Member.findById(req.memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    // Mettre à jour les champs
    member.ville = ville || member.ville;
    member.ville_mobilisation = ville_mobilisation || member.ville_mobilisation;
    member.section = section || member.section;
    member.centres_interet_competences = centres_interet_competences || member.centres_interet_competences;
    
    // Vérifier si profil complet
    const postLoginFields = ['ville', 'ville_mobilisation', 'section', 'centres_interet_competences'];
    const isProfileCompleted = postLoginFields.every(field => 
      member[field] && member[field].trim() !== ''
    );
    member.profileCompleted = isProfileCompleted;
    
    await member.save();
    
    res.json({
      success: true,
      message: isProfileCompleted ? '✅ Profil complété avec succès!' : '📝 Profil mis à jour',
      member: member.toJSON(),
      profileCompleted: isProfileCompleted
    });
    
  } catch (error) {
    console.error('Erreur complétion profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
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