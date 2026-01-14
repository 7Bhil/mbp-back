const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Import des routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const adminRoutes = require('./routes/adminRoutes');
const postRoutes = require('./routes/postRoutes');

// Import du middleware d'upload
const { uploadPostFiles } = require('./middleware/upload');

const app = express();

// ============ CONFIGURATION ============
// Chemin des uploads
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
console.log('📁 Dossier uploads racine:', UPLOADS_ROOT);

// URLs client autorisées
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL, // URL de production (Netlify)
  process.env.CLIENT_URL?.replace('https://', 'http://'), // Version HTTP
  'https://mouvementpatriotiquedubenin.netlify.app',
  'http://mouvementpatriotiquedubenin.netlify.app'
].filter(Boolean); // Supprime les valeurs undefined

console.log('🌐 URLs client autorisées:', allowedOrigins);

// ============ CORS COMPLET POUR PRODUCTION ============
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine
    if (!origin) return callback(null, true);
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Pour le développement, on peut être plus permissif
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Origine non autorisée en développement: ${origin}`);
      return callback(null, true);
    }
    
    // En production, rejeter les origines non autorisées
    console.error(`🚫 Origine non autorisée en production: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition', 'Set-Cookie']
}));

// Gérer les pré-vols OPTIONS
app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ CRÉATION DES DOSSIERS UPLOADS ============
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
      console.log(`✅ Dossier créé: ${path.relative(path.join(__dirname, '..'), dir)}`);
    }
  });
};

createUploadsStructure();

// ============ CONNEXION MONGODB ============
console.log('🔗 Connexion MongoDB...');
console.log('🔑 MongoDB URI:', process.env.MONGODB_URI ? '✓ Définie' : '✗ Non définie');

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

// ============ FONCTION POUR CRÉER L'ADMIN AUTOMATIQUEMENT ============
async function createDefaultAdmin() {
  try {
    console.log('\n👑 Vérification du compte administrateur...');
    
    // Importer le modèle Member - chemin corrigé
    const Member = require('./models/Member');
    
    // Vérifier si un admin existe déjà
    const adminExists = await Member.findOne({ 
      email: 'admin@gmail.com',
      role: 'admin' 
    });
    
    if (adminExists) {
      console.log('✅ Compte admin déjà existant');
      console.log(`   📧 Email: ${adminExists.email}`);
      console.log(`   👤 Nom: ${adminExists.prenom} ${adminExists.nom}`);
      console.log(`   🆔 ID: ${adminExists.memberId}`);
      return;
    }
    
    // Si aucun admin n'existe, en créer un
    console.log('👑 Création du compte administrateur par défaut...');
    
    const adminData = {
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
      phoneCode: '+229',
      telephone: '00000000',
      birthYear: 1990,
      pays: 'Bénin',
      department: 'Littoral',
      commune: 'Cotonou',
      profession: 'Fonctionnaire',
      disponibilite: 'Temps plein',
      motivation: 'Compte administrateur principal du Mouvement Patriotique du Bénin pour la gestion des membres et du système.',
      password: 'admin123',
      role: 'admin',
      status: 'Actif',
      isActive: true
    };
    
    const admin = new Member(adminData);
    await admin.save();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN CRÉÉ AUTOMATIQUEMENT !');
    console.log('='.repeat(60));
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Mot de passe: admin123');
    console.log('🆔 Member ID:', admin.memberId);
    console.log('🔢 Membership Number:', admin.membershipNumber);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('⚠️ Erreur lors de la création de l\'admin:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', error.stack);
    }
  }
}

// ============ INITIALISATION APRÈS CONNEXION MONGODB ============
mongoose.connection.once('open', async () => {
  console.log('✅ Connexion MongoDB établie');
  
  // Attendre un peu pour être sûr que tout est initialisé
  setTimeout(async () => {
    await createDefaultAdmin();
  }, 1000);
});

// ============ SERVICE STATIQUE POUR LES UPLOADS ============
app.use('/uploads', (req, res, next) => {
  // Headers CORS pour les fichiers statiques
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
}, express.static(UPLOADS_ROOT));

// ============ ROUTES DE DÉBOGAGE ============
app.post('/api/debug/upload-test', uploadPostFiles, (req, res) => {
  console.log('🔍 DEBUG - Files présent:', req.files ? 'Oui' : 'Non');
  
  res.json({
    success: true,
    message: 'Test upload réussi',
    files: req.files ? Object.keys(req.files) : []
  });
});

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

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);

// ============ ROUTE SANTÉ ============
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    success: true,
    message: 'API MPB - Mouvement Patriotique du Bénin',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL,
    database: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
    allowedOrigins: allowedOrigins,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    }
  });
});

// ============ ROUTE 404 ============
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
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ DÉMARRAGE DU SERVEUR ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🎯 ==============================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`🌐 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 URL API: http://localhost:${PORT}/api`);
  console.log(`🌍 Client URL: ${process.env.CLIENT_URL || 'Non définie'}`);
  console.log(`🔐 CORS: ${allowedOrigins.length} origine(s) autorisée(s)`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`💪 Health: http://localhost:${PORT}/api/health`);
  console.log(`🎯 ==============================================\n`);
  
  // Vérifier les images existantes
  const postsDir = path.join(UPLOADS_ROOT, 'images', 'posts');
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir);
    console.log(`📸 ${files.length} image(s) dans uploads/images/posts/`);
  }
});