const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/complete', profileController.completeProfile);
router.get('/status', profileController.getProfileStatus);

module.exports = router;