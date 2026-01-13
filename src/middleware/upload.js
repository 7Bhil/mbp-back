// middleware/upload.js - VERSION CORRIGÉE
const multer = require('multer');
const path = require('path');

// Configuration multer pour mémoire
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    if (file.mimetype.startsWith('image/') && allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type d'image non supporté: ${ext}`), false);
    }
  }
});

// Convertir en base64
const convertToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// Middleware pour traiter les uploads
exports.processUploadToBase64 = async (req, res, next) => {
  try {
    console.log('🔄 Traitement des fichiers en base64...');
    console.log('📎 Fichiers reçus:', req.files ? 'Oui' : 'Non');
    
    if (req.files && req.files.images) {
      const imagesArray = Array.isArray(req.files.images) 
        ? req.files.images 
        : [req.files.images];
      
      const processedImages = [];
      
      for (const img of imagesArray) {
        console.log(`📸 Traitement image: ${img.originalname} (${img.size} bytes)`);
        
        const base64Data = convertToBase64(img.buffer, img.mimetype);
        
        processedImages.push({
          filename: img.originalname,
          originalName: img.originalname,
          mimetype: img.mimetype,
          size: img.size,
          base64: base64Data,
          thumbnailBase64: base64Data, // Pour simplifier, même que l'original
          isMain: processedImages.length === 0,
          uploadedAt: new Date()
        });
      }
      
      console.log(`✅ ${processedImages.length} image(s) convertie(s) en base64`);
      req.processedImages = processedImages;
    } else {
      console.log('📭 Aucune image à traiter');
      req.processedImages = [];
    }
    
    next();
  } catch (error) {
    console.error('❌ Erreur traitement base64:', error);
    next(error);
  }
};

// Middleware d'upload pour les posts
exports.uploadPostFiles = [
  upload.fields([
    { name: 'images', maxCount: 10 }
  ]),
  exports.processUploadToBase64
];

exports.uploadMemberPhoto = upload.single('photo');
exports.uploadSingleImage = upload.single('image');