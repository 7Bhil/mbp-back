const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const superAdminController = require('../controllers/superAdminController');

// 🛡️ TOUTES les routes sont protégées par Auth + SuperAdmin
router.use(authenticate);
router.use(requireSuperAdmin);

// Stats
router.get('/stats', superAdminController.getSystemStats);

// Gestion Admins
router.get('/admins', superAdminController.getAllAdmins);
router.post('/promote', superAdminController.promoteToAdmin);
router.post('/demote', superAdminController.demoteAdmin);

// Actions Destructrices
router.delete('/user/:userId', superAdminController.deleteUserForce);

module.exports = router;
