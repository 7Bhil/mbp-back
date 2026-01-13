const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import des routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const adminRoutes = require('./routes/adminRoutes');
const postRoutes = require('./routes/postRoutes');

// Import du middleware d'upload
const { uploadPostFiles } = require('./middleware/upload');

const app = express();

// ============ CONFIGURATION ============
// IMPORTANT: Même chemin que dans upload.js
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
console.log('📁 Dossier uploads racine:', UPLOADS_ROOT);

// Vérifier/créer la structure des dossiers
const createUploadsStructure = () => {
  const directories = [
    UPLOADS_ROOT,
    path.join(UPLOADS_ROOT, 'images', 'posts'),
    path.join(UPLOADS_ROOT, 'images', 'members'),
    path.join(UPLOADS_ROOT, 'documents', 'posts'),
    path.join(UPLOADS_ROOT, 'documents', 'members')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Dossier créé: ${path.relative(__dirname, dir)}`);
    }
  });
};

createUploadsStructure();

// ============ CORS COMPLET ============
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
}));

app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ CONNEXION MONGODB ============
console.log('🔗 Connexion MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connecté!');
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
  process.exit(1);
});

// ============ SERVICE STATIQUE POUR LES UPLOADS ============
// IMPORTANT: Servir depuis le dossier racine des uploads
app.use('/uploads', (req, res, next) => {
  // Headers CORS pour les fichiers statiques
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
}, express.static(UPLOADS_ROOT));

// ============ ROUTES DE DÉBOGAGE ============
// Route de debug pour tester les uploads
app.post('/api/debug/upload-test', uploadPostFiles, (req, res) => {
  console.log('🔍 DEBUG - Headers Content-Type:', req.headers['content-type']);
  console.log('🔍 DEBUG - Body keys:', Object.keys(req.body));
  console.log('🔍 DEBUG - Files présent:', req.files ? 'Oui' : 'Non');
  
  if (req.files) {
    console.log('🔍 DEBUG - Images reçues:', req.files.images ? req.files.images.length : 0);
  }
  
  console.log('🔍 DEBUG - Processed Images:', req.processedImages ? req.processedImages.length : 0);
  
  res.json({
    success: true,
    message: 'Test upload réussi',
    bodyFields: Object.keys(req.body),
    filesReceived: req.files ? {
      images: req.files.images ? req.files.images.map(f => ({
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype
      })) : []
    } : null,
    processedImages: req.processedImages ? req.processedImages.map(img => ({
      filename: img.filename,
      size: img.size,
      hasBase64: !!img.base64
    })) : []
  });
});

// Route pour vérifier la structure des uploads
app.get('/api/uploads/check', (req, res) => {
  try {
    const checkDir = (dir) => {
      const exists = fs.existsSync(dir);
      let files = [];
      let count = 0;
      
      if (exists) {
        files = fs.readdirSync(dir);
        count = files.length;
      }
      
      return { exists, count, files: files.slice(0, 5) };
    };
    
    const results = {
      uploadsRoot: {
        path: UPLOADS_ROOT,
        ...checkDir(UPLOADS_ROOT)
      },
      imagesPosts: {
        path: path.join(UPLOADS_ROOT, 'images', 'posts'),
        ...checkDir(path.join(UPLOADS_ROOT, 'images', 'posts'))
      },
      imagesMembers: {
        path: path.join(UPLOADS_ROOT, 'images', 'members'),
        ...checkDir(path.join(UPLOADS_ROOT, 'images', 'members'))
      }
    };
    
    res.json({
      success: true,
      message: 'Vérification des uploads',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour tester l'accès aux images
app.get('/api/uploads/test-image', (req, res) => {
  const postsDir = path.join(UPLOADS_ROOT, 'images', 'posts');
  
  if (!fs.existsSync(postsDir)) {
    return res.json({
      success: false,
      message: 'Dossier images/posts non trouvé',
      path: postsDir
    });
  }
  
  const files = fs.readdirSync(postsDir);
  const images = files
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .slice(0, 5)
    .map(file => ({
      filename: file,
      url: `http://localhost:5000/uploads/images/posts/${file}`,
      path: path.join(postsDir, file),
      size: fs.statSync(path.join(postsDir, file)).size
    }));
  
  res.json({
    success: true,
    count: files.length,
    images: images,
    testUrls: images.map(img => img.url)
  });
});

// Route pour servir une image de placeholder
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const text = `MPB ${width}x${height}`;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#003366"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" 
            fill="white" text-anchor="middle" dy=".3em">
        ${text}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);

// Route santé
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    success: true,
    message: 'API MPB - Mouvement Patriotique du Bénin',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
    uploads: {
      root: UPLOADS_ROOT,
      exists: fs.existsSync(UPLOADS_ROOT),
      imagesPosts: fs.existsSync(path.join(UPLOADS_ROOT, 'images', 'posts')),
      imagesMembers: fs.existsSync(path.join(UPLOADS_ROOT, 'images', 'members'))
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    },
    endpoints: {
      uploads: 'http://localhost:5000/uploads',
      uploadsCheck: 'http://localhost:5000/api/uploads/check',
      testImages: 'http://localhost:5000/api/uploads/test-image',
      placeholder: 'http://localhost:5000/api/placeholder/400/300',
      debugUpload: 'http://localhost:5000/api/debug/upload-test'
    }
  });
});

// Route 404
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route API non trouvée',
    requestedUrl: req.originalUrl
  });
});

// ============ GESTION DES ERREURS ============
app.use((err, req, res, next) => {
  console.error('🔥 Erreur serveur:', err.message);
  
  // Erreurs spécifiques
  if (err.name === 'CorsError') {
    return res.status(403).json({
      success: false,
      message: 'Accès CORS interdit'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Fichier trop volumineux (max 10MB)'
    });
  }
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Erreur d'upload: ${err.message}`
    });
  }
  
  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============ DÉMARRAGE DU SERVEUR ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🎯 ==============================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`📡 URL API: http://localhost:${PORT}/api`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`🔍 Vérif uploads: http://localhost:${PORT}/api/uploads/check`);
  console.log(`📸 Test images: http://localhost:${PORT}/api/uploads/test-image`);
  console.log(`🐛 Debug upload: http://localhost:${PORT}/api/debug/upload-test`);
  console.log(`✅ CORS activé pour: localhost:5173, localhost:5174`);
  console.log(`🎯 ==============================================\n`);
  
  // Afficher la structure des uploads
  const postsDir = path.join(UPLOADS_ROOT, 'images', 'posts');
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir);
    console.log(`📸 ${files.length} image(s) dans uploads/images/posts/`);
    if (files.length > 0) {
      console.log('📋 Dernières images:', files.slice(-3).join(', '));
    }
  }
});