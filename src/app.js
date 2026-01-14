const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement
require('dotenv').config();

const app = express();

// ============ CONFIGURATION ============
// Déterminer le chemin des uploads selon l'environnement
const isRender = process.env.RENDER || false;
const UPLOADS_ROOT = isRender 
  ? path.join('/opt/render/project/uploads')
  : path.join(__dirname, '..', '..', 'uploads');

console.log('📁 Dossier uploads racine:', UPLOADS_ROOT);
console.log('🌍 Environnement:', process.env.NODE_ENV || 'development');
console.log('🏗️  Sur Render:', isRender ? 'Oui' : 'Non');

// Nettoyer l'URL client (enlever le slash à la fin)
const cleanClientUrl = process.env.CLIENT_URL ? 
  process.env.CLIENT_URL.replace(/\/$/, '') : '';

// URLs client autorisées
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  cleanClientUrl,
  cleanClientUrl?.replace('https://', 'http://'),
  'https://mouvementpatriotiquedubenin.netlify.app',
  'http://mouvementpatriotiquedubenin.netlify.app',
  // Pour Render Preview
  'https://mpb-backend.onrender.com',
  'http://mpb-backend.onrender.com'
].filter((origin, index, self) => 
  origin && self.indexOf(origin) === index
);

console.log('🌐 URLs client autorisées:', allowedOrigins);

// ============ CORS POUR PRODUCTION ============
const corsOptions = {
  origin: function (origin, callback) {
    // En développement ou sur Render, être plus permissif
    if (process.env.NODE_ENV !== 'production' || isRender) {
      return callback(null, true);
    }
    
    // En production stricte, vérifier l'origine
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.error(`🚫 Origine non autorisée: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
      console.log(`✅ Dossier créé: ${dir}`);
    }
  });
};

createUploadsStructure();

// ============ CONNEXION MONGODB ============
console.log('\n🔗 Connexion MongoDB...');

// URI MongoDB selon l'environnement
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/mpb_db';

if (!mongoURI.includes('localhost') && !mongoURI.includes('127.0.0.1')) {
  console.log('🔐 Connexion à MongoDB Atlas/Cloud');
} else {
  console.log('🏠 Connexion à MongoDB local');
  console.warn('⚠️  ATTENTION: MongoDB local - Vérifiez que MongoDB est démarré!');
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 secondes
  socketTimeoutMS: 45000, // 45 secondes
})
.then(() => {
  console.log('✅ MongoDB connecté avec succès!');
  console.log(`📊 Base de données: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ ERREUR MongoDB:', err.message);
  
  if (mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1')) {
    console.log('\n💡 CONSEIL POUR MONGODB LOCAL:');
    console.log('1. Démarrer MongoDB: sudo systemctl start mongod');
    console.log('2. Vérifier le statut: sudo systemctl status mongod');
    console.log('3. Activer au démarrage: sudo systemctl enable mongod');
  }
  
  // Ne pas quitter immédiatement en production, laisser le serveur démarrer
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Le serveur démarre sans connexion MongoDB');
  } else {
    process.exit(1);
  }
});

// ============ FONCTION POUR CRÉER L'ADMIN ============
async function createDefaultAdmin() {
  try {
    // Attendre que MongoDB soit connecté
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ En attente de la connexion MongoDB pour créer l\'admin...');
      return;
    }
    
    console.log('\n👑 Vérification du compte administrateur...');
    
    // Importer le modèle Member
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
    
    // Créer l'admin
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
    console.error('⚠️ Erreur création admin:', error.message);
  }
}

// ============ ÉVÉNEMENTS MONGODB ============
mongoose.connection.on('connected', () => {
  console.log('✅ Événement: MongoDB connecté');
  
  // Créer l'admin après connexion
  setTimeout(createDefaultAdmin, 2000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Événement: Erreur MongoDB', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Événement: MongoDB déconnecté');
});

// ============ SERVICE STATIQUE ============
app.use('/uploads', express.static(UPLOADS_ROOT));

// Route pour vérifier l'accès aux fichiers
app.get('/api/uploads/list', (req, res) => {
  try {
    const postsDir = path.join(UPLOADS_ROOT, 'images', 'posts');
    let files = [];
    
    if (fs.existsSync(postsDir)) {
      files = fs.readdirSync(postsDir)
        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        .map(file => ({
          filename: file,
          url: `${req.protocol}://${req.get('host')}/uploads/images/posts/${file}`,
          size: fs.statSync(path.join(postsDir, file)).size
        }));
    }
    
    res.json({
      success: true,
      count: files.length,
      files: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ ROUTES API ============
// Import des routes (assurez-vous que ces fichiers existent)
try {
  const authRoutes = require('./routes/authRoutes');
  const memberRoutes = require('./routes/memberRoutes');
  const adminRoutes = require('./routes/adminRoutes');
  const postRoutes = require('./routes/postRoutes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/posts', postRoutes);
  
  console.log('✅ Routes API chargées');
} catch (error) {
  console.error('⚠️ Erreur chargement routes:', error.message);
}

// ============ ROUTES DE BASE ============
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    message: 'MPB API Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    render: isRender,
    database: dbStatus,
    clientUrl: cleanClientUrl,
    uploadsPath: UPLOADS_ROOT,
    endpoints: {
      auth: '/api/auth',
      members: '/api/members',
      admin: '/api/admin',
      posts: '/api/posts',
      uploads: '/api/uploads/list',
      health: '/api/health'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API du Mouvement Patriotique du Bénin',
    documentation: 'Consultez /api/health pour plus d\'informations',
    version: '1.0.0'
  });
});

// ============ GESTION DES ERREURS ============
app.use((err, req, res, next) => {
  console.error('🔥 Erreur:', err.message);
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============ DÉMARRAGE DU SERVEUR ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🎯 ==============================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 ==============================================\n`);
  
  // Afficher les infos MongoDB
  if (mongoose.connection.readyState === 1) {
    console.log(`📊 MongoDB: Connecté à ${mongoose.connection.name}`);
  } else {
    console.log(`⚠️  MongoDB: Non connecté (état: ${mongoose.connection.readyState})`);
  }
});

// Export pour les tests
module.exports = app;
