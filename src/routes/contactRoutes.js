const express = require('express');
const router = express.Router();
const { submitContact, getContacts, markAsRead, deleteContact } = require('../controllers/contactController');
const { register, verifyEmail, login, verifyToken, changePassword, logout, testEmail, googleCallback } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const passport = require('passport');

// Route publique pour envoyer un message
router.post('/', submitContact);

// Routes protégées Admin
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getContacts);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteContact);

module.exports = router;
