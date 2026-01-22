const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac'); // Ou roleAuth selon votre structure

// Routes protégées Admin
router.use(authenticate);
router.use(isAdmin); // Assurez-vous que ce middleware existe et est importé correctement

router.get('/members', reportController.generateMembersCSV);

module.exports = router;
