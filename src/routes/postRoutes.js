// src/routes/postRoutes.js - VERSION SIMPLE
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// Middleware upload SIMPLE
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer simple
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/images/posts/';
    if (file.mimetype.startsWith('image/')) {
      folder = 'uploads/images/posts/';
    } else {
      folder = 'uploads/documents/posts/';
    }
    
    const fullPath = path.join(__dirname, '..', folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Routes publiques
router.get('/', postController.getAllPosts);
router.get('/search', postController.searchPosts);
router.get('/:id', postController.getPostById);

// Création avec upload
router.post('/', upload.array('images', 5), postController.createPost);

module.exports = router;