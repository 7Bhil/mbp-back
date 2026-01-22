const Member = require('../models/Member');

/**
 * Middleware pour restreindre l'accès uniquement aux Super Admins
 */
exports.requireSuperAdmin = async (req, res, next) => {
    try {
        // req.member est déjà peuplé par le middleware authenticate
        if (!req.member) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        if (req.member.role !== 'super_admin') {
            console.warn(`⛔ Accès Super Admin refusé pour ${req.member.email} (Rôle: ${req.member.role})`);
            return res.status(403).json({
                success: false,
                message: 'Accès refusé : Privilèges Super Admin requis',
                error: 'FORBIDDEN_ACCESS'
            });
        }

        next();
    } catch (error) {
        console.error('❌ Erreur middleware Super Admin:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * Middleware pour restreindre l'accès aux Admins et Super Admins
 */
exports.requireAdmin = async (req, res, next) => {
    try {
        if (!req.member) {
            return res.status(401).json({ success: false, message: 'Authentification requise' });
        }

        if (!['admin', 'super_admin'].includes(req.member.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé : Privilèges Administrateur requis'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
