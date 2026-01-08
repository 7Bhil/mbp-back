const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticate } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Profil
router.get('/profile', memberController.getProfile);
router.put('/profile', memberController.updateProfile);

// Admin (pour le moment accessible à tous les membres authentifiés)
router.get('/all', memberController.getAllMembers);

module.exports = router;
