const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // AJOUTER fs
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import des routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const adminRoutes = require('./routes/adminRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();

// ============ CONFIGURATION ============
const UPLOADS_DIR = path.join(__dirname, 'uploads');
console.log('📁 Dossier uploads:', UPLOADS_DIR);

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('✅ Dossier uploads créé');
}

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ MONGODB ============
console.log('🔗 Connexion MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
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

// ============ FICHIERS STATIQUES AVEC CORS ============
// Middleware pour ajouter CORS aux images
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
}, express.static(UPLOADS_DIR));

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);

// ============ ROUTES DE TEST ============
// Route pour vérifier les uploads
app.get('/api/uploads/check', (req, res) => {
  try {
    const postsDir = path.join(UPLOADS_DIR, 'images', 'posts');
    let files = [];
    
    if (fs.existsSync(postsDir)) {
      files = fs.readdirSync(postsDir).map(file => ({
        name: file,
        url: `/uploads/images/posts/${file}`,
        fullUrl: `http://localhost:5000/uploads/images/posts/${file}`,
        path: path.join(postsDir, file)
      }));
    }
    
    res.json({
      success: true,
      uploadsPath: UPLOADS_DIR,
      exists: fs.existsSync(UPLOADS_DIR),
      filesCount: files.length,
      files: files.slice(0, 10) // Limiter à 10 fichiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour tester une image spécifique
app.get('/api/uploads/test/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, 'images', 'posts', req.params.filename);
  
  if (fs.existsSync(filePath)) {
    res.json({
      success: true,
      exists: true,
      path: filePath,
      url: `http://localhost:5000/uploads/images/posts/${req.params.filename}`,
      stat: fs.statSync(filePath)
    });
  } else {
    res.status(404).json({
      success: false,
      exists: false,
      message: 'Fichier non trouvé'
    });
  }
});

// Route santé
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    success: true,
    message: 'API MPB - Mouvement Patriotique du Bénin',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
    uploads: {
      path: UPLOADS_DIR,
      exists: fs.existsSync(UPLOADS_DIR)
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    }
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    requestedUrl: req.originalUrl
  });
});

// ============ GESTION ERREURS ============
app.use((err, req, res, next) => {
  console.error('🔥 Erreur:', err.message);
  
  // Erreur CORS
  if (err.name === 'CorsError') {
    return res.status(403).json({
      success: false,
      message: 'Accès CORS interdit'
    });
  }
  
  // Erreur fichier trop gros
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Fichier trop volumineux (max 10MB)'
    });
  }
  
  // Erreur multer
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Erreur upload: ${err.message}`
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ DÉMARRAGE ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🎯 ==============================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Uploads: http://localhost:${PORT}/api/uploads/check`);
  console.log(`📁 Fichiers: http://localhost:${PORT}/uploads`);
  console.log(`✅ CORS: localhost:5173, localhost:5174`);
  console.log(`🎯 ==============================================\n`);
  
  // Vérifier la structure uploads
  const postsDir = path.join(UPLOADS_DIR, 'images', 'posts');
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir);
    console.log(`📸 ${files.length} image(s) dans uploads/images/posts/`);
    if (files.length > 0) {
      console.log('  Dernière image:', files[files.length - 1]);
    }
  }
});