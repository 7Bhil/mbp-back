const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleAuth');

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Gestion des membres
router.get('/members', adminController.getAllMembers);
router.get('/members/:id', adminController.getMemberById);
router.put('/members/:id', adminController.updateMember);
router.post('/members/:id/toggle-status', adminController.toggleMemberStatus);
router.post('/members/:id/promote', adminController.promoteToAdmin);

// Recherche
router.get('/members/search/:query', adminController.searchMembers);

// Nouvelle route : Profils incomplets
router.get('/incomplete-profiles', adminController.getIncompleteProfiles);

// Suppression définitive
router.delete('/members/:id', adminController.deleteMember);

module.exports = router;