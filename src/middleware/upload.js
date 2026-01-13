// middleware/upload.js - VERSION CORRIGÉE
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Dossier racine - POINTE VERS uploads/ DANS src/
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Créer la structure
const createUploadsStructure = () => {
  const directories = [
    UPLOADS_DIR,
    path.join(UPLOADS_DIR, 'images', 'posts'),
    path.join(UPLOADS_DIR, 'images', 'members'),
    path.join(UPLOADS_DIR, 'documents', 'posts'),
    path.join(UPLOADS_DIR, 'documents', 'members')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadsStructure();

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'images/posts/';
    
    // Si c'est une route member
    if (req.baseUrl && req.baseUrl.includes('members')) {
      if (file.mimetype.startsWith('image/')) {
        folder = 'images/members/';
      } else {
        folder = 'documents/members/';
      }
    } else {
      // Route post
      if (file.mimetype.startsWith('image/')) {
        folder = 'images/posts/';
      } else {
        folder = 'documents/posts/';
      }
    }
    
    const destPath = path.join(UPLOADS_DIR, folder);
    cb(null, destPath);
  },
  
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.parse(file.originalname).name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    const fileName = `${uniquePrefix}-${name}${ext}`;
    cb(null, fileName);
  }
});

// Filtrage
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    images: /jpeg|jpg|png|gif|webp|svg/,
    documents: /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv/
  };
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (file.mimetype.startsWith('image/') && allowedTypes.images.test(ext)) {
    cb(null, true);
  } else if (allowedTypes.documents.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Type non supporté: ${file.originalname}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});

// Middlewares
exports.uploadPostFiles = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'files', maxCount: 5 }
]);

exports.uploadMemberPhoto = upload.single('photo');
exports.uploadSingleImage = upload.single('image');
exports.uploadSingleFile = upload.single('file');

// Utilitaires
exports.deleteFile = (filePath) => {
  // Convertir l'URL en chemin physique
  let physicalPath;
  
  if (filePath.startsWith('/uploads/')) {
    // URL -> chemin physique
    physicalPath = path.join(__dirname, '..', filePath);
  } else if (filePath.startsWith('uploads/')) {
    // Chemin relatif
    physicalPath = path.join(__dirname, '..', filePath);
  } else {
    // Déjà chemin physique
    physicalPath = filePath;
  }
  
  if (fs.existsSync(physicalPath)) {
    try {
      fs.unlinkSync(physicalPath);
      console.log(`🗑️ Supprimé: ${physicalPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression: ${error.message}`);
      return false;
    }
  }
  return false;
};

// Fonction pour obtenir l'URL publique d'un fichier
exports.getPublicUrl = (filePath) => {
  if (!filePath) return null;
  
  // Si c'est déjà une URL
  if (filePath.startsWith('http')) return filePath;
  
  // Convertir chemin physique en URL publique
  const relativePath = path.relative(path.join(__dirname, '..', 'uploads'), filePath);
  return `/uploads/${relativePath}`;
};