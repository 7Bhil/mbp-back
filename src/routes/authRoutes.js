// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

// Routes d'authentification
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/verify', authController.verifyToken);
router.put('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.get('/test-email', authController.testEmail);

// --- ROUTES AUTH GOOGLE ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    authController.googleCallback
);

module.exports = router;