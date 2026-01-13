// src/controllers/postController.js - VERSION SIMPLE
const Post = require('../models/Post');

// Récupérer toutes les publications
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true })
      .populate('author', 'prenom nom role')
      .sort('-publishDate')
      .limit(20);
    
    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('❌ Erreur récupération posts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer une publication
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'prenom nom role');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('❌ Erreur récupération post:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Créer une publication (simplifiée)
exports.createPost = async (req, res) => {
  try {
    console.log('📝 Création post...');
    
    const { title, content, type, category } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Titre et contenu requis'
      });
    }
    
    // Note: req.memberId viendra du middleware auth
    const postData = {
      title,
      content,
      type: type || 'actualité',
      category: category || 'politique',
      author: req.memberId || '65a1b2c3d4e5f6a7b8c9d0e1' // ID temporaire
    };
    
    // Gérer les images si présentes
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images) 
        ? req.files.images 
        : [req.files.images];
      
      postData.images = images.map(img => ({
        url: `/uploads/images/posts/${img.filename}`,
        filename: img.filename,
        originalName: img.originalname,
        size: img.size
      }));
    }
    
    const post = new Post(postData);
    await post.save();
    
    res.status(201).json({
      success: true,
      message: 'Publication créée',
      post
    });
    
  } catch (error) {
    console.error('❌ Erreur création post:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur création'
    });
  }
};

// Rechercher
exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    
    const posts = await Post.find({
      isPublished: true,
      $text: { $search: q }
    })
    .populate('author', 'prenom nom role')
    .limit(20);
    
    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur recherche'
    });
  }
};