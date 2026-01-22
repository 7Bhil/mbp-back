const Member = require('../models/Member');

// === STATISTIQUES SYSTÈME ===
exports.getSystemStats = async (req, res) => {
    try {
        const totalMembers = await Member.countDocuments();
        const adminCount = await Member.countDocuments({ role: 'admin' });
        const superAdminCount = await Member.countDocuments({ role: 'super_admin' });
        const memberCount = await Member.countDocuments({ role: 'member' });

        // Stats d'activité récentes
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newRegistrations24h = await Member.countDocuments({ dateInscription: { $gte: last24h } });

        res.json({
            success: true,
            stats: {
                totalGlobal: totalMembers,
                breakdown: {
                    superAdmin: superAdminCount,
                    admins: adminCount,
                    members: memberCount
                },
                activity: {
                    registrationsLast24h: newRegistrations24h
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur stats' });
    }
};

// === GESTION DES ADMINS ===

// Liste de tous les administrateurs (sauf soi-même si désiré, mais le Super Admin doit tout voir)
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Member.find({ role: { $in: ['admin', 'super_admin'] } })
            .select('-password')
            .sort({ role: 1, dateInscription: -1 }); // Super Admin en haut

        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur récupération admins' });
    }
};

// Promouvoir un membre en Admin
exports.promoteToAdmin = async (req, res) => {
    try {
        const { memberId } = req.body;

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Membre introuvable' });
        }

        if (member.role === 'super_admin') {
            return res.status(400).json({ success: false, message: 'Impossible de modifier un Super Admin' });
        }

        if (member.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Ce membre est déjà administrateur' });
        }

        member.role = 'admin';
        await member.save();

        console.log(`👑 [SUPER ADMIN ACTION] ${req.member.email} a promu ${member.email} en Admin`);

        res.json({
            success: true,
            message: `${member.prenom} ${member.nom} est maintenant Administrateur.`,
            member: { _id: member._id, email: member.email, role: member.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur promotion' });
    }
};

// Rétrograder un Admin en Membre
exports.demoteAdmin = async (req, res) => {
    try {
        const { adminId } = req.body;

        const adminToDemote = await Member.findById(adminId);
        if (!adminToDemote) {
            return res.status(404).json({ success: false, message: 'Administrateur introuvable' });
        }

        // PROTECTION CRITIQUE : Ne jamais permettre de rétrograder un Super Admin
        if (adminToDemote.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: '⛔ ACTION INTERDITE : Impossible de rétrograder un Super Admin.'
            });
        }

        adminToDemote.role = 'member';
        await adminToDemote.save();

        console.log(`⬇️ [SUPER ADMIN ACTION] ${req.member.email} a rétrogradé ${adminToDemote.email}`);

        res.json({
            success: true,
            message: `${adminToDemote.prenom} ${adminToDemote.nom} a été rétrogradé en Membre.`,
            user: { _id: adminToDemote._id, email: adminToDemote.email, role: adminToDemote.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur rétrogradation' });
    }
};

// === ACTIONS DESTRUCTRICES ===

// Suppression définitive d'un utilisateur (Admin ou Membre)
exports.deleteUserForce = async (req, res) => {
    try {
        const { userId } = req.params;

        const userToDelete = await Member.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        }

        // PROTECTION ULTIME : Le Super Admin ne peut pas être supprimé via API
        if (userToDelete.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: '⛔ ACTION INTERDITE : Le Super Admin ne peut pas être supprimé.'
            });
        }

        await Member.findByIdAndDelete(userId);

        console.log(`💀 [SUPER ADMIN ACTION] ${req.member.email} a SUPPRIMÉ DÉFINITIVEMENT ${userToDelete.email}`);

        res.json({
            success: true,
            message: `Utilisateur ${userToDelete.email} supprimé définitivement.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur suppression' });
    }
};
