const Member = require('../models/Member');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ isActive: true });
    const admins = await Member.countDocuments({ role: 'admin' });
    const completedProfiles = await Member.countDocuments({ profileCompleted: true });

    // Inscriptions récentes (7 derniers jours)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentRegistrations = await Member.countDocuments({
      dateInscription: { $gte: oneWeekAgo }
    });

    // Taux d'inscription ce mois (vs mois dernier)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthCount = await Member.countDocuments({
      dateInscription: { $gte: firstDayOfMonth }
    });
    const lastMonthCount = await Member.countDocuments({
      dateInscription: { $gte: firstDayOfLastMonth, $lt: firstDayOfMonth }
    });

    const registrationRate = lastMonthCount > 0
      ? Math.round((thisMonthCount / lastMonthCount) * 100)
      : 100;

    // Distribution par département (Top 3)
    const departmentStats = await Member.aggregate([
      { $match: { departement: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$departement', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    const departmentDistribution = departmentStats.map(d => ({
      name: d._id,
      count: d.count,
      percentage: Math.round((d.count / totalMembers) * 100)
    }));

    // Dernières activités (inscriptions récentes)
    const recentMembers = await Member.find()
      .sort({ dateInscription: -1 })
      .limit(3)
      .select('nom prenom dateInscription email');

    const recentActivities = recentMembers.map(m => ({
      type: 'inscription',
      member: `${m.prenom} ${m.nom}`,
      email: m.email,
      date: m.dateInscription
    }));

    // Distribution par âge
    const ageDistribution = await Member.aggregate([
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [16, 25, 35, 50, 65, 100],
          default: "65+",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        admins,
        completedProfiles,
        incompleteProfiles: totalMembers - completedProfiles,
        recentRegistrations,
        registrationRate,
        departmentDistribution,
        recentActivities,
        ageDistribution
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
    delete updates.dateInscription;

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
        { memberId: { $regex: query, $options: 'i' } },
        { commune: { $regex: query, $options: 'i' } },
        { ville: { $regex: query, $options: 'i' } }
      ]
    })
      .select('nom prenom email role departement commune ville age memberId profileCompleted isActive dateInscription')
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

// Récupérer les membres avec profil incomplet
exports.getIncompleteProfiles = async (req, res) => {
  try {
    const members = await Member.find({ profileCompleted: false })
      .select('nom prenom email age memberId profileCompleted dateInscription')
      .sort('-dateInscription')
      .limit(50);

    res.json({
      success: true,
      count: members.length,
      members
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Supprimer définitivement un membre
exports.deleteMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Protection : Empêcher la suppression de soi-même
    if (member._id.toString() === req.memberId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte administrateur'
      });
    }

    // Protection supplémentaire : Empêcher la suppression d'autres admins (optionnel, mais recommandé)
    // Si on veut permettre aux Super Admins de supprimer des admins, il faudrait une logique de rôle plus complexe
    // Ici on empêche simplement un admin de supprimer un autre admin
    if (member.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer un administrateur. Veuillez le rétrograder d\'abord.'
      });
    }

    await Member.findByIdAndDelete(memberId);

    res.json({
      success: true,
      message: 'Membre supprimé définitivement',
      deletedId: memberId
    });

  } catch (error) {
    console.error('Erreur suppression membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression'
    });
  }
};