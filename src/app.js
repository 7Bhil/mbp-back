// server.js (app.js principal)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ============ CONFIGURATION DE BASE ============
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;

console.log('='.repeat(60));
console.log('🚀 SERVEUR MPB - DÉMARRAGE');
console.log('='.repeat(60));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log(`🌍 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log();

// ============ CONFIGURATION CORS ============
const ALLOWED_ORIGINS = IS_DEVELOPMENT
  ? [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ]
  : [
      'https://mouvementpatriotiquedubenin.netlify.app',
      'http://mouvementpatriotiquedubenin.netlify.app'
    ];

console.log('🌐 Configuration CORS:');
ALLOWED_ORIGINS.forEach(origin => console.log(`   ✅ ${origin}`));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`   ❌ Origine bloquée: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('   📥 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ============ CONFIGURATION MONGODB ============
console.log('\n🔗 Configuration MongoDB:');

const MONGODB_URI = process.env.MONGODB_URI || 
  (IS_PRODUCTION 
    ? 'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/mpb_db');

console.log(`   📡 URL: ${MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://***:***@')}`);

const MONGOOSE_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
};

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
    console.log('   ✅ MongoDB connecté');
    console.log(`   📊 Base: ${mongoose.connection.name}`);
    console.log(`   🌐 Hôte: ${mongoose.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB déconnecté');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error.message);
    
    if (IS_PRODUCTION) {
      console.log('⏳ Nouvelle tentative dans 5s...');
      setTimeout(connectToMongoDB, 5000);
    }
    
    return false;
  }
}

// ============ CHARGEMENT DES ROUTES ============
console.log('\n🛣️  Chargement des routes:');

// 1. Chargement des routes AUTH (prioritaire)
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('   ✅ /api/auth routes chargées');
  
  // Route de test directe pour auth
  app.post('/api/auth/test', (req, res) => {
    res.json({
      success: true,
      message: 'Route /api/auth/test fonctionnelle',
      timestamp: new Date().toISOString(),
      received: req.body
    });
  });
} catch (error) {
  console.error('❌ Erreur chargement authRoutes:', error.message);
  
  // Route de secours
  app.post('/api/auth/login', (req, res) => {
    console.log('🔐 Route /api/auth/login (secours) appelée');
    res.json({
      success: true,
      message: 'Route de secours - Connexion simulée',
      token: 'fake-token-secours',
      member: {
        _id: 'fake-id',
        email: req.body.identifier,
        prenom: 'Test',
        nom: 'User',
        role: 'member',
        profileCompleted: false
      }
    });
  });
}

// 2. Chargement des autres routes
const routeModules = [
  { path: '/api/members', file: 'memberRoutes' },
  { path: '/api/admin', file: 'adminRoutes' },
  { path: '/api/posts', file: 'postRoutes' },
  { path: '/api/profile', file: 'profileRoutes' }
];

routeModules.forEach(route => {
  try {
    if (fs.existsSync(path.join(__dirname, 'routes', `${route.file}.js`))) {
      const module = require(`./routes/${route.file}`);
      app.use(route.path, module);
      console.log(`   ✅ ${route.path} routes chargées`);
    } else {
      console.log(`   ⚠️  ${route.file}.js non trouvé`);
    }
  } catch (error) {
    console.error(`❌ Erreur chargement ${route.path}:`, error.message);
  }
});

// ============ ROUTES DE BASE ============

// Route santé
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API MPB - Serveur en ligne',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      members: '/api/members/*',
      admin: '/api/admin/*',
      posts: '/api/posts/*',
      profile: '/api/profile/*'
    }
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API du Mouvement Patriotique du Bénin',
    version: '1.0.0',
    documentation: 'http://localhost:5000/api/health',
    status: 'online'
  });
});

// ============ ROUTES DE DEBUG ============

// Lister toutes les routes disponibles
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  
  function printRoutes(layer, path = '') {
    if (layer.route) {
      const routePath = path + layer.route.path;
      routes.push({
        path: routePath,
        methods: Object.keys(layer.route.methods)
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const routerPath = layer.regexp.source
        .replace('\\/', '/')
        .replace('(?:\\/(?=$))?$', '')
        .replace(/^\/\^/, '')
        .replace(/\$\/$/, '')
        .replace(/\\\//g, '/');
      
      layer.handle.stack.forEach(sublayer => {
        printRoutes(sublayer, path + routerPath);
      });
    }
  }
  
  app._router.stack.forEach(layer => {
    printRoutes(layer);
  });
  
  res.json({
    success: true,
    count: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// ============ ROUTES DE TEST POUR AUTH ============

// Route de test GET pour auth
app.get('/api/auth/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Route GET /api/auth/debug fonctionnelle',
    availableEndpoints: [
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/verify',
      'PUT /api/auth/change-password',
      'POST /api/auth/test (test direct)'
    ]
  });
});

// Route de test POST simple
app.post('/api/auth/simple-login', (req, res) => {
  console.log('🧪 Route /api/auth/simple-login appelée');
  console.log('📥 Données reçues:', req.body);
  
  res.json({
    success: true,
    message: 'Connexion de test réussie',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NmFhMjEyZWIxZWQxYmUyMWQ0NWVjNyIsImlhdCI6MTc2ODU5NjgzNCwiZXhwIjoxNzcxMTg4ODM0fQ.z28IzX8rd7j91IpgxXPzZgrDq2nXxsshpcYza8L8vm8',
    member: {
      _id: '696aa212eb1ed1be21d45ec7',
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@mpb.bj',
      role: 'admin',
      profileCompleted: true,
      memberId: 'MPB1768595986988NO91QA3ZL'
    }
  });
});

// ============ GESTION DES ERREURS ============

// Route 404 pour API
app.use('/api/*', (req, res) => {
  console.log(`❌ Route non trouvée: ${req.originalUrl}`);
  
  // Lister les routes disponibles qui commencent par /api
  const availableRoutes = [];
  function findRoutes(layer, path = '') {
    if (layer.route) {
      const routePath = path + layer.route.path;
      if (routePath.startsWith('/api')) {
        availableRoutes.push({
          path: routePath,
          methods: Object.keys(layer.route.methods)
        });
      }
    } else if (layer.name === 'router' && layer.handle.stack) {
      const routerPath = layer.regexp.source
        .replace('\\/', '/')
        .replace('(?:\\/(?=$))?$', '')
        .replace(/^\/\^/, '')
        .replace(/\$\/$/, '')
        .replace(/\\\//g, '/');
      
      layer.handle.stack.forEach(sublayer => {
        findRoutes(sublayer, path + routerPath);
      });
    }
  }
  
  app._router.stack.forEach(layer => {
    findRoutes(layer);
  });
  
  res.status(404).json({
    success: false,
    message: 'Endpoint API non trouvé',
    requestedUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: availableRoutes
      .filter(route => route.methods.includes(req.method.toLowerCase()))
      .map(route => route.path)
      .slice(0, 10) // Limiter à 10 pour la lisibilité
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('🔥 Erreur serveur:', err.message);
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: 'Erreur serveur',
    error: IS_DEVELOPMENT ? err.message : 'Erreur interne'
  });
});

// ============ CRÉATION ADMIN PAR DÉFAUT ============
async function createDefaultAdmin() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ MongoDB non connecté, report création admin...');
      setTimeout(createDefaultAdmin, 3000);
      return;
    }
    
    const Member = require('./models/Member');
    
    const existingAdmin = await Member.findOne({ email: 'admin@mpb.bj' });
    
    if (existingAdmin) {
      console.log('👑 Admin existant trouvé:');
      console.log(`   📧 ${existingAdmin.email}`);
      console.log(`   👤 ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log(`   🔑 Mot de passe: ${existingAdmin.password ? 'défini' : 'non défini'}`);
      return;
    }
    
    console.log('👑 Création du compte administrateur...');
    
    const admin = new Member({
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@mpb.bj',
      password: 'AdminMPB2024!',
      role: 'admin',
      profileCompleted: true,
      isActive: true,
      status: 'Actif'
    });
    
    await admin.save();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ADMINISTRATEUR CRÉÉ AVEC SUCCÈS!');
    console.log('='.repeat(50));
    console.log('📧 Email: admin@mpb.bj');
    console.log('🔑 Mot de passe: AdminMPB2024!');
    console.log('🆔 Member ID:', admin.memberId);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erreur création admin:', error.message);
  }
}

// ============ DÉMARRAGE DU SERVEUR ============
async function startServer() {
  console.log('\n🚀 Démarrage du serveur...');
  
  // Connexion MongoDB
  const mongoConnected = await connectToMongoDB();
  
  if (!mongoConnected && IS_PRODUCTION) {
    console.error('❌ Impossible de se connecter à MongoDB en production');
    process.exit(1);
  }
  
  // Création admin
  if (mongoConnected) {
    setTimeout(createDefaultAdmin, 1000);
  }
  
  const PORT = process.env.PORT || 5000;
  const HOST = 'localhost';
  
  app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SERVEUR MPB DÉMARRÉ AVEC SUCCÈS!');
    console.log('='.repeat(60));
    console.log(`📡 URL: http://${HOST}:${PORT}`);
    console.log(`🔧 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
    
    console.log('\n🔗 LIENS IMPORTANTS:');
    console.log(`📈 Santé API: http://${HOST}:${PORT}/api/health`);
    console.log(`🔍 Debug routes: http://${HOST}:${PORT}/api/debug/routes`);
    console.log(`🧪 Test auth: http://${HOST}:${PORT}/api/auth/debug`);
    console.log(`curl http://${HOST}:${PORT}/api/health`);
    console.log(`curl -X POST http://${HOST}:${PORT}/api/auth/simple-login -H "Content-Type: application/json" -d '{"identifier":"test@test.com","password":"test123"}'`);
    console.log('='.repeat(60));
  });
}

// ============ GESTION DES SIGNNAUX ============
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt gracieux du serveur...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Exception non gérée:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Rejet non géré:', reason);
});

// ============ DÉMARRER ============
startServer();

module.exports = app;