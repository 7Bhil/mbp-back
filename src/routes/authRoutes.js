// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes d'authentification
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/verify', authController.verifyToken);
router.put('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;