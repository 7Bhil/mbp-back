// controllers/postController.js - VERSION COMPLÈTE
const Post = require('../models/Post');

// ============ FONCTIONS PUBLIQUES ============

exports.getAllPosts = async (req, res) => {
  try {
    const { 
      type, 
      category, 
      featured, 
      limit = 20, 
      page = 1,
      sort = '-publishDate'
    } = req.query;
    
    const filter = { status: 'publié', isPublished: true };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await Post.find(filter)
      .populate('author', 'prenom nom role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      posts
    });
    
  } catch (error) {
    console.error('❌ Erreur getAllPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

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
    console.error('❌ Erreur getPostById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    
    const posts = await Post.find({
      status: 'publié',
      isPublished: true,
      $text: { $search: q }
    })
    .populate('author', 'prenom nom role')
    .sort('-publishDate')
    .limit(50);
    
    res.json({
      success: true,
      count: posts.length,
      posts
    });
    
  } catch (error) {
    console.error('❌ Erreur searchPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.getFeaturedPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      featured: true,
      status: 'publié',
      isPublished: true
    })
    .populate('author', 'prenom nom role')
    .sort('-publishDate')
    .limit(10);
    
    res.json({
      success: true,
      count: posts.length,
      posts
    });
    
  } catch (error) {
    console.error('❌ Erreur getFeaturedPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.getRecentPosts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const posts = await Post.find({
      status: 'publié',
      isPublished: true
    })
    .populate('author', 'prenom nom role')
    .sort('-publishDate')
    .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: posts.length,
      posts
    });
    
  } catch (error) {
    console.error('❌ Erreur getRecentPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============ INTERACTIONS ============

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    const memberId = req.memberId;
    const hasLiked = post.likes.includes(memberId);
    
    if (hasLiked) {
      post.likes.pull(memberId);
    } else {
      post.likes.push(memberId);
      post.dislikes.pull(memberId);
    }
    
    await post.save();
    
    res.json({
      success: true,
      message: hasLiked ? 'Like retiré' : 'Publication likée',
      likes: post.likes.length,
      dislikes: post.dislikes.length
    });
    
  } catch (error) {
    console.error('❌ Erreur likePost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.dislikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    const memberId = req.memberId;
    const hasDisliked = post.dislikes.includes(memberId);
    
    if (hasDisliked) {
      post.dislikes.pull(memberId);
    } else {
      post.dislikes.push(memberId);
      post.likes.pull(memberId);
    }
    
    await post.save();
    
    res.json({
      success: true,
      message: hasDisliked ? 'Dislike retiré' : 'Publication dislikée',
      likes: post.likes.length,
      dislikes: post.dislikes.length
    });
    
  } catch (error) {
    console.error('❌ Erreur dislikePost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ============ ADMIN ============

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
    
    const postData = {
      title,
      content,
      type: type || 'actualité',
      category: category || 'politique',
      author: req.memberId
    };
    
    // Gérer les images
    if (req.files && req.files.images) {
      const imagesArray = Array.isArray(req.files.images) 
        ? req.files.images 
        : [req.files.images];
      
      postData.images = imagesArray.map((img, index) => {
        const url = `/uploads/images/posts/${img.filename}`;
        
        return {
          path: img.path,
          url: url,
          filename: img.filename,
          originalName: img.originalname,
          size: img.size,
          isMain: index === 0
        };
      });
    }
    
    const post = new Post(postData);
    await post.save();
    
    res.status(201).json({
      success: true,
      message: 'Publication créée',
      post
    });
    
  } catch (error) {
    console.error('❌ Erreur createPost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur création'
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const updates = req.body;
    const postId = req.params.id;
    
    delete updates.author;
    delete updates.likes;
    delete updates.dislikes;
    
    const post = await Post.findByIdAndUpdate(
      postId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('author', 'prenom nom role');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Publication mise à jour',
      post
    });
    
  } catch (error) {
    console.error('❌ Erreur updatePost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur mise à jour'
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Publication supprimée'
    });
    
  } catch (error) {
    console.error('❌ Erreur deletePost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur suppression'
    });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    post.featured = !post.featured;
    await post.save();
    
    res.json({
      success: true,
      message: post.featured 
        ? 'Publication mise en avant' 
        : 'Publication retirée des mises en avant',
      featured: post.featured
    });
    
  } catch (error) {
    console.error('❌ Erreur toggleFeatured:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['publié', 'brouillon', 'archivé'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Choisissez parmi: ${validStatuses.join(', ')}`
      });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    post.status = status;
    post.isPublished = status === 'publié';
    
    if (status === 'publié' && !post.publishDate) {
      post.publishDate = new Date();
    }
    
    await post.save();
    
    res.json({
      success: true,
      message: `Publication ${status}`,
      status: post.status
    });
    
  } catch (error) {
    console.error('❌ Erreur changeStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.getPostsStats = async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ 
      status: 'publié', 
      isPublished: true 
    });
    const featuredPosts = await Post.countDocuments({ featured: true });
    
    res.json({
      success: true,
      stats: {
        total: totalPosts,
        published: publishedPosts,
        featured: featuredPosts
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getPostsStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};