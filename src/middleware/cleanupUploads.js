const { deleteFromCloudinary } = require('../middleware/upload');
const Post = require('../models/Post');

// Middleware pour nettoyer les fichiers Cloudinary avant suppression/mise à jour
exports.cleanupPostFiles = async (req, res, next) => {
  try {
    if (req.method === 'DELETE' || req.method === 'PUT') {
      const post = await Post.findById(req.params.id);
      
      if (post) {
        // Supprimer les images de Cloudinary
        for (const image of post.images) {
          if (image.publicId) {
            await deleteFromCloudinary(image.publicId, 'image');
          }
        }
        
        // Supprimer les fichiers de Cloudinary
        for (const file of post.files) {
          if (file.publicId) {
            await deleteFromCloudinary(file.publicId, 'raw');
          }
        }
      }
    }
    next();
  } catch (error) {
    console.error('Erreur cleanup files:', error);
    next(); // Continuer même en cas d'erreur
  }
};