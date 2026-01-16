const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ============ CONFIGURATION ============
const isRender = process.env.RENDER === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log('\n' + '='.repeat(60));
console.log('🚀 DÉMARRAGE SERVEUR MPB - Mouvement Patriotique du Bénin');
console.log('='.repeat(60));
console.log(`🌍 Environnement: ${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log(`🏢 Plateforme: ${isRender ? 'Render' : 'Local'}`);
console.log(`📅 ${new Date().toLocaleString()}`);

// ============ CONFIGURATION MONGODB ============
console.log('\n🔗 CONFIGURATION MONGODB');

let mongoURI;
if (isProduction) {
  mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ ERREUR CRITIQUE: MONGODB_URI non défini en production!');
    console.log('\n🔧 CONFIGURATION REQUISE POUR RENDER:');
    console.log('1. Variables d\'environnement nécessaires:');
    console.log('   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mpb_db');
    console.log('   NODE_ENV=production');
    console.log('   JWT_SECRET=votre_secret_jwt_tres_long_et_securise');
    console.log('   PORT=10000 (automatique sur Render)');
    process.exit(1);
  }
  
  console.log('📊 Mode: PRODUCTION (MongoDB Atlas)');
} else {
  mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
  console.log('📊 Mode: DÉVELOPPEMENT (MongoDB local)');
}

// Masquer le mot de passe dans les logs
const maskedURI = mongoURI ? mongoURI.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://***:***@') : 'undefined';
console.log(`🔗 URI MongoDB: ${maskedURI}`);

// Configuration mongoose
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
  ...(isProduction ? {
    ssl: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false
  } : {
    family: 4
  })
};

// ============ CONNEXION MONGODB AVEC RETRY ============
async function connectToMongoDB() {
  const maxRetries = 5;
  const retryDelay = 5000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔄 Tentative de connexion MongoDB ${attempt}/${maxRetries}...`);
      
      await mongoose.connect(mongoURI, mongooseOptions);
      
      const conn = mongoose.connection;
      console.log(`✅ MongoDB connecté avec succès!`);
      console.log(`📊 Base de données: ${conn.name}`);
      console.log(`📍 Hôte: ${conn.host}`);
      console.log(`🔢 Port: ${conn.port || 'N/A'}`);
      
      // Événements MongoDB
      conn.on('connected', () => console.log('📡 Événement: MongoDB connecté'));
      conn.on('disconnected', () => console.log('⚠️  Événement: MongoDB déconnecté'));
      conn.on('error', (err) => console.error('❌ Erreur MongoDB:', err.message));
      
      return true;
      
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Nouvelle tentative dans ${retryDelay/1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('\n❌ Impossible de se connecter à MongoDB après plusieurs tentatives');
        console.log('\n🔧 DIAGNOSTIC:');
        
        if (isProduction) {
          console.log('1. Vérifiez l\'URI MongoDB Atlas dans les variables d\'environnement');
          console.log('2. Vérifiez les règles réseau sur MongoDB Atlas (0.0.0.0/0)');
          console.log('3. Vérifiez le nom d\'utilisateur et mot de passe');
        } else {
          console.log('1. Vérifiez que MongoDB est en cours d\'exécution');
          console.log('   $ mongod --version');
          console.log('   $ brew services start mongodb-community  # macOS');
          console.log('   $ sudo systemctl start mongod           # Linux');
          console.log('   $ net start MongoDB                     # Windows');
        }
        
        return false;
      }
    }
  }
}

// ============ CONFIGURATION CORS ============
const allowedOrigins = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://localhost:5000'
    ]
  : [
      'https://mouvementpatriotiquedubenin.netlify.app',
      'http://mouvementpatriotiquedubenin.netlify.app'
    ];

console.log('\n🌐 CONFIGURATION CORS');
console.log('Origines autorisées:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (curl, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = `Origine non autorisée: ${origin}`;
      console.warn('⚠️  CORS bloqué:', msg);
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Pré-vol des requêtes
app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ============ GESTION DES DOSSIERS UPLOADS ============
let UPLOADS_ROOT;
if (isRender) {
  UPLOADS_ROOT = '/opt/render/project/uploads';
} else {
  UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
}

console.log(`\n📁 CONFIGURATION DOSSIERS`);
console.log(`Dossier uploads: ${UPLOADS_ROOT}`);

// Créer la structure de dossiers
const createUploadsStructure = () => {
  const directories = [
    UPLOADS_ROOT,
    path.join(UPLOADS_ROOT, 'images', 'posts'),
    path.join(UPLOADS_ROOT, 'images', 'members'),
    path.join(UPLOADS_ROOT, 'documents')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Dossier créé: ${dir}`);
    }
  });
};

createUploadsStructure();

// Service statique pour les uploads
app.use('/uploads', express.static(UPLOADS_ROOT));

// ============ CRÉATION ADMIN AUTOMATIQUE ============
async function createDefaultAdmin() {
  try {
    console.log('\n👑 VÉRIFICATION COMPTE ADMINISTRATEUR');
    
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ MongoDB pas encore prêt, nouvelle tentative dans 3s...');
      setTimeout(createDefaultAdmin, 3000);
      return;
    }
    
    // Vérifier si les modèles sont disponibles
    try {
      var Member = require('./models/Member');
    } catch (error) {
      console.log('⏳ Modèle Member non disponible, nouvelle tentative dans 5s...');
      setTimeout(createDefaultAdmin, 5000);
      return;
    }
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await Member.findOne({ 
      email: 'admin@mpb.bj',
      role: 'admin' 
    });
    
    if (existingAdmin) {
      console.log('✅ Administrateur existant:');
      console.log(`   📧 Email: ${existingAdmin.email}`);
      console.log(`   👤 Nom: ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log(`   🆔 ID: ${existingAdmin.memberId}`);
      return;
    }
    
    // Créer le compte admin
    console.log('👑 CRÉATION DU COMPTE ADMINISTRATEUR PAR DÉFAUT');
    
    const adminData = {
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@mpb.bj',
      age: 35,
      code_telephone: '+229',
      telephone: '00000000',
      pays: 'Bénin',
      departement: 'Littoral',
      commune: 'Cotonou',
      ville: 'Cotonou',
      ville_mobilisation: 'Cotonou',
      section: 'Administration',
      centres_interet_competences: 'Gestion, Administration, Développement',
      profession: 'Fonctionnaire',
      disponibilite: 'Temps plein',
      motivation: 'Compte administrateur principal du Mouvement Patriotique du Bénin.',
      engagement_valeurs_mpb: true,
      consentement_donnees: true,
      password: 'AdminMPB2024!',
      role: 'admin',
      permissions: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings'],
      status: 'Actif',
      isActive: true,
      profileCompleted: true
    };
    
    const admin = new Member(adminData);
    await admin.save();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMINISTRATEUR CRÉÉ AVEC SUCCÈS !');
    console.log('='.repeat(60));
    console.log('📧 Email: admin@mpb.bj');
    console.log('🔑 Mot de passe: AdminMPB2024!');
    console.log('🆔 Member ID:', admin.memberId);
    console.log('🔢 Membership:', admin.membershipNumber);
    console.log('='.repeat(60));
    console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!');
    console.log('='.repeat(60));
    
  } catch (error) {
    if (error.code === 11000) {
      console.log('ℹ️  Admin existe déjà (duplication ignorée)');
    } else {
      console.error('❌ Erreur création admin:', error.message);
      console.error('🔧 Stack:', error.stack);
    }
  }
}

// ============ CHARGEMENT DES ROUTES ============
console.log('\n🛣️  CHARGEMENT DES ROUTES API');

// Fonction pour charger une route avec gestion d'erreur
const loadRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} chargé`);
    return route;
  } catch (error) {
    console.error(`❌ Erreur chargement ${routeName}:`, error.message);
    
    // Créer une route de secours
    const router = require('express').Router();
    router.all('*', (req, res) => {
      res.status(503).json({
        success: false,
        message: `Service ${routeName} temporairement indisponible`,
        error: isDevelopment ? error.message : undefined
      });
    });
    
    return router;
  }
};

// Charger toutes les routes
const authRoutes = loadRoute('./routes/authRoutes', 'authRoutes');
const memberRoutes = loadRoute('./routes/memberRoutes', 'memberRoutes');
const adminRoutes = loadRoute('./routes/adminRoutes', 'adminRoutes');
const postRoutes = loadRoute('./routes/postRoutes', 'postRoutes');
const profileRoutes = loadRoute('./routes/profileRoutes', 'profileRoutes');

// Monter les routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profile', profileRoutes);

console.log('✅ Toutes les routes montées');

// ============ ROUTES DE BASE ============
// Route santé pour vérifier le serveur
app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    
    let dbInfo = {
      status: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState],
      state: dbState,
      name: mongoose.connection.name || 'N/A',
      host: mongoose.connection.host || 'N/A'
    };
    
    // Statistiques si MongoDB est connecté
    let stats = {};
    let adminInfo = null;
    
    if (dbState === 1) {
      try {
        const Member = require('./models/Member');
        
        // Informations admin
        const admin = await Member.findOne({ email: 'admin@mpb.bj', role: 'admin' })
          .select('email prenom nom memberId role profileCompleted');
        
        if (admin) {
          adminInfo = admin.toObject();
        }
        
        // Statistiques
        stats = {
          members: await Member.countDocuments(),
          activeMembers: await Member.countDocuments({ isActive: true }),
          completedProfiles: await Member.countDocuments({ profileCompleted: true }),
          admins: await Member.countDocuments({ role: 'admin' })
        };
        
      } catch (dbError) {
        console.log('⚠️  Impossible de récupérer les stats:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'API MPB - Mouvement Patriotique du Bénin',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      server: {
        port: process.env.PORT || 5000,
        nodeEnv: process.env.NODE_ENV,
        uploadsPath: UPLOADS_ROOT,
        status: 'online',
        uptime: process.uptime()
      },
      database: dbInfo,
      admin: adminInfo,
      stats: stats,
      endpoints: {
        auth: '/api/auth',
        members: '/api/members',
        admin: '/api/admin',
        posts: '/api/posts',
        profile: '/api/profile',
        health: '/api/health'
      },
      documentation: `https://${req.get('host')}/api/health`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: isDevelopment ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API du Mouvement Patriotique du Bénin',
    description: 'Système de gestion des membres et administration',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      members: '/api/members',
      admin: '/api/admin',
      posts: '/api/posts',
      profile: '/api/profile'
    },
    documentation: 'Consultez /api/health pour plus d\'informations'
  });
});

// Route de test pour vérifier les uploads
app.get('/api/uploads-test', (req, res) => {
  res.json({
    success: true,
    message: 'Service uploads fonctionnel',
    uploadsPath: UPLOADS_ROOT,
    exists: fs.existsSync(UPLOADS_ROOT),
    directories: fs.readdirSync(UPLOADS_ROOT, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
  });
});

// ============ GESTION DES ERREURS ============
// Route 404 pour API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API non trouvé',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/verify',
      '/api/members',
      '/api/admin',
      '/api/posts',
      '/api/profile'
    ],
    timestamp: new Date().toISOString()
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('\n🔥 ERREUR SERVEUR:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const errorResponse = {
    success: false,
    message: err.message || 'Erreur serveur interne',
    timestamp: new Date().toISOString()
  };
  
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

// ============ DÉMARRAGE DU SERVEUR ============
async function startServer() {
  try {
    console.log('\n🚀 DÉMARRAGE DU SERVEUR');
    
    // 1. Connexion MongoDB
    console.log('📊 Connexion à la base de données...');
    const mongoConnected = await connectToMongoDB();
    
    if (!mongoConnected) {
      console.error('❌ Impossible de démarrer sans connexion MongoDB');
      process.exit(1);
    }
    
    // 2. Créer l'admin après un délai
    console.log('👑 Initialisation administrateur...');
    setTimeout(() => {
      createDefaultAdmin();
    }, 2000);
    
    // 3. Démarrer le serveur HTTP
    const PORT = process.env.PORT || 5000;
    const HOST = isProduction ? '0.0.0.0' : 'localhost';
    
    app.listen(PORT, HOST, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 SERVEUR MPB DÉMARRÉ AVEC SUCCÈS !');
      console.log('='.repeat(60));
      console.log(`📡 URL: http://${HOST}:${PORT}`);
      console.log(`🌍 Environnement: ${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
      console.log(`🏢 Plateforme: ${isRender ? 'Render' : 'Local'}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
      console.log(`📁 Uploads: ${UPLOADS_ROOT}`);
      console.log('='.repeat(60));
      console.log('\n🔍 TESTS RAPIDES:');
      console.log(`   curl http://${HOST}:${PORT}/api/health`);
      console.log(`   curl -X POST http://${HOST}:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"admin@mpb.bj","password":"AdminMPB2024!","loginType":"email"}'`);
      console.log('\n⚠️  REMARQUES:');
      console.log('   • Vérifiez que toutes les variables d\'environnement sont définies');
      console.log('   • Changez le mot de passe admin après la première connexion');
      console.log('   • Sauvegardez régulièrement votre base de données');
      console.log('='.repeat(60));
    });
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE DÉMARRAGE SERVEUR:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

module.exports = app;