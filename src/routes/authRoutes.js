const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Inscription
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Vérifier token
router.get('/verify', authController.verifyToken);

module.exports = router;
