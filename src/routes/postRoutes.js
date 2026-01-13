// routes/postRoutes.js - VERSION CORRIGÉE
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleAuth');
const { uploadPostFiles } = require('../middleware/upload');

// ============ ROUTES PUBLIQUES ============
router.get('/', postController.getAllPosts);
router.get('/search', postController.searchPosts);
router.get('/featured', postController.getFeaturedPosts);
router.get('/recent', postController.getRecentPosts);
router.get('/:id', postController.getPostById);

// Récupérer une image complète
router.get('/:postId/images/:imageId', postController.getFullImage);

// ============ ROUTES AUTHENTIFIÉES ============
router.use(authenticate);

router.post('/:id/like', postController.likePost);
router.post('/:id/dislike', postController.dislikePost);

// ============ ROUTES ADMIN ============
router.use(isAdmin);

// CRUD Posts
router.post('/', uploadPostFiles, postController.createPost);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

// Gestion des images
router.post('/:id/images', uploadPostFiles, postController.addImagesToPost);
router.delete('/:postId/images/:imageId', postController.deleteImageFromPost);

// Gestion statut
router.put('/:id/featured', postController.toggleFeatured);
router.put('/:id/status', postController.changeStatus);

// Statistiques
router.get('/stats/summary', postController.getPostsStats);

module.exports = router;