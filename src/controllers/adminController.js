const Member = require('../models/Member');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ isActive: true });
    const admins = await Member.countDocuments({ role: 'admin' });
    
    // Inscriptions récentes (7 derniers jours)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentRegistrations = await Member.countDocuments({
      dateInscription: { $gte: oneWeekAgo }
    });
    
    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        admins,
        recentRegistrations
      }
    });
    
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer tous les membres
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find()
      .select('-password')
      .sort('-dateInscription');
    
    res.json({
      success: true,
      members
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer un membre
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).select('-password');
    
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
      message: 'Erreur serveur'
    });
  }
};

// Mettre à jour un membre
exports.updateMember = async (req, res) => {
  try {
    const updates = req.body;
    const memberId = req.params.id;
    
    // Empêcher la modification de certains champs
    delete updates.email;
    delete updates.password;
    delete updates.memberId;
    delete updates.membershipNumber;
    
    const member = await Member.findByIdAndUpdate(
      memberId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Membre mis à jour',
      member
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

// Activer/désactiver un membre (soft delete)
exports.toggleMemberStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    // Ne pas permettre de désactiver un autre admin (sauf si c'est soi-même)
    if (member.role === 'admin' && member._id.toString() !== req.memberId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver un autre administrateur'
      });
    }
    
    member.isActive = !member.isActive;
    member.status = member.isActive ? 'Actif' : 'Inactif';
    await member.save();
    
    res.json({
      success: true,
      message: member.isActive ? 'Membre activé' : 'Membre désactivé',
      member: {
        _id: member._id,
        isActive: member.isActive,
        status: member.status
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Promouvoir un membre en admin
exports.promoteToAdmin = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    
    member.role = 'admin';
    await member.save();
    
    res.json({
      success: true,
      message: 'Membre promu administrateur',
      member: {
        _id: member._id,
        nom: member.nom,
        prenom: member.prenom,
        email: member.email,
        role: member.role
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Recherche de membres
exports.searchMembers = async (req, res) => {
  try {
    const query = req.params.query;
    
    const members = await Member.find({
      $or: [
        { nom: { $regex: query, $options: 'i' } },
        { prenom: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { membershipNumber: { $regex: query, $options: 'i' } }
      ]
    })
    .select('nom prenom email role department commune isActive dateInscription')
    .limit(20);
    
    res.json({
      success: true,
      members
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};