// controllers/postController.js - VERSION CORRIGÉE
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
      .limit(parseInt(limit))
      .select('-images.base64'); // Exclure les grandes images
    
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

// ============ ADMIN ============
exports.createPost = async (req, res) => {
  try {
    console.log('📝 Création post...');
    console.log('📎 Corps de la requête:', req.body);
    console.log('📸 Images traitées:', req.processedImages ? `Oui, ${req.processedImages.length} image(s)` : 'Non');
    
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
      author: req.memberId,
      status: 'publié',
      isPublished: true,
      publishDate: new Date()
    };
    
    // Ajouter les images en base64
    if (req.processedImages && Array.isArray(req.processedImages) && req.processedImages.length > 0) {
      console.log(`📸 Ajout de ${req.processedImages.length} image(s) en base64`);
      
      postData.images = req.processedImages.map((img, index) => ({
        filename: img.filename,
        originalName: img.originalName,
        mimetype: img.mimetype,
        size: img.size,
        base64: img.base64,
        thumbnailBase64: img.thumbnailBase64,
        isMain: index === 0,
        uploadedAt: img.uploadedAt || new Date()
      }));
      
      console.log('✅ Images ajoutées au post');
    } else {
      console.log('📭 Aucune image à ajouter');
      postData.images = [];
    }
    
    const post = new Post(postData);
    await post.save();
    
    console.log(`✅ Post créé avec ${post.images.length} image(s)`);
    
    // Préparer la réponse
    const postResponse = post.toObject();
    
    // Ne pas envoyer les grandes images base64 dans la réponse
    if (postResponse.images && postResponse.images.length > 0) {
      postResponse.images = postResponse.images.map(img => ({
        _id: img._id,
        filename: img.filename,
        originalName: img.originalName,
        mimetype: img.mimetype,
        size: img.size,
        thumbnailBase64: img.thumbnailBase64,
        isMain: img.isMain,
        uploadedAt: img.uploadedAt
      }));
    }
    
    res.status(201).json({
      success: true,
      message: 'Publication créée avec succès',
      post: postResponse
    });
    
  } catch (error) {
    console.error('❌ Erreur createPost:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Fonctions existantes (simplifiées)
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'prenom nom role')
      .select('-images.base64');
    
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
    ).populate('author', 'prenom nom role')
     .select('-images.base64');
    
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

// Autres fonctions...
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
    .limit(50)
    .select('-images.base64');
    
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
    .limit(10)
    .select('-images.base64');
    
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
    .limit(parseInt(limit))
    .select('-images.base64');
    
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
// Dans postController.js, ajoutez cette fonction :
exports.getFullImage = async (req, res) => {
  try {
    const { postId, imageId } = req.params;
    
    const post = await Post.findOne({
      _id: postId,
      status: 'publié',
      isPublished: true
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    const image = post.images.id(imageId);
    if (!image || !image.base64) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }
    
    res.json({
      success: true,
      image: {
        _id: image._id,
        filename: image.filename,
        mimetype: image.mimetype,
        base64: image.base64,
        isMain: image.isMain
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getFullImage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.addImagesToPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    if (req.processedImages && req.processedImages.length > 0) {
      console.log(`📸 Ajout de ${req.processedImages.length} image(s)`);
      
      // Ajouter les nouvelles images
      req.processedImages.forEach(img => {
        post.images.push({
          filename: img.filename,
          originalName: img.originalName,
          mimetype: img.mimetype,
          size: img.size,
          base64: img.base64,
          thumbnailBase64: img.thumbnailBase64,
          isMain: post.images.length === 0, // Si c'est la première image
          uploadedAt: new Date()
        });
      });
      
      await post.save();
    }
    
    res.json({
      success: true,
      message: `${req.processedImages?.length || 0} image(s) ajoutée(s)`,
      postId: post._id
    });
    
  } catch (error) {
    console.error('❌ Erreur addImagesToPost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout des images'
    });
  }
};

exports.deleteImageFromPost = async (req, res) => {
  try {
    const { postId, imageId } = req.params;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publication non trouvée'
      });
    }
    
    // Trouver et supprimer l'image
    const imageIndex = post.images.findIndex(img => img._id.toString() === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }
    
    post.images.splice(imageIndex, 1);
    await post.save();
    
    res.json({
      success: true,
      message: 'Image supprimée'
    });
    
  } catch (error) {
    console.error('❌ Erreur deleteImageFromPost:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};