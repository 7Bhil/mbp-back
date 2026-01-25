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
    const criticalFields = [
      'nom', 'prenom', 'telephone', 'age', 'pays', 'commune',
      'profession', 'disponibilite', 'motivation',
      'ville', 'ville_mobilisation', 'section', 'centres_interet_competences',
      'engagement_valeurs_mpb', 'consentement_donnees'
    ];

    const missingFields = criticalFields.filter(field => {
      const val = member[field];
      if (typeof val === 'string') return !val || val.trim() === '';
      if (typeof val === 'number') return !val;
      if (typeof val === 'boolean') return val === false;
      return !val;
    });

    const profileStatus = {
      completed: member.profileCompleted,
      missingFields,
      progress: Math.round(((criticalFields.length - missingFields.length) / criticalFields.length) * 100)
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
    const updates = req.body;

    // Champs autorisés
    const allowedFields = [
      'nom', 'prenom', 'telephone', 'code_telephone', 'age', 'pays', 'departement', 'commune',
      'profession', 'disponibilite', 'motivation',
      'ville', 'ville_mobilisation', 'section', 'centres_interet_competences',
      'engagement_valeurs_mpb', 'consentement_donnees'
    ];

    const filteredUpdates = {};
    allowedFields.forEach(f => {
      if (updates[f] !== undefined) filteredUpdates[f] = updates[f];
    });

    const member = await Member.findById(req.memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Membre non trouvé' });

    Object.assign(member, filteredUpdates);

    // Vérifier si complet
    const criticalFields = [
      'nom', 'prenom', 'telephone', 'age', 'pays', 'commune',
      'profession', 'disponibilite', 'motivation',
      'ville', 'ville_mobilisation', 'section', 'centres_interet_competences',
      'engagement_valeurs_mpb', 'consentement_donnees'
    ];

    const isProfileNowCompleted = criticalFields.every(field => {
      const val = member[field];
      if (typeof val === 'string') return val && val.trim() !== '';
      if (typeof val === 'number') return !!val;
      if (typeof val === 'boolean') return val === true;
      return !!val;
    });

    member.profileCompleted = isProfileNowCompleted;
    if (isProfileNowCompleted) {
      member.status = 'Actif';
    }

    await member.save();

    res.json({
      success: true,
      message: isProfileNowCompleted ? '✅ Profil complété avec succès!' : '📝 Profil mis à jour partiellement',
      member,
      profileStatus: {
        completed: member.profileCompleted,
        missingFields: criticalFields.filter(f => !member[f]),
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