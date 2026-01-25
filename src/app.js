// src/app.js - VERSION CORRIGÉE
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const passport = require('passport');
require('./config/passport'); // Importer la configuration passport

const app = express();

// ============ CONFIGURATION DE BASE ============
app.use(passport.initialize());
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

console.log('='.repeat(50));
console.log('🚀 MPB API - En ligne');
console.log('='.repeat(50));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log(`🌍 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log(`🔧 Port: ${PORT}`);

// ============ CORS SIMPLE ============
// ============ CORS SIMPLE (PERMISSIF POUR DEBUG) ============
app.use(cors({
  origin: true, // ⚠️ Autorise dynamiquement toute origine (mieux que '*' car supporte credentials)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// ============ MIDDLEWARES ESSENTIELS ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.originalUrl}`);
  next();
});


// ============ CONNEXION MONGODB ============
const MONGODB_URI = process.env.MONGODB_URI ||
  (IS_PRODUCTION
    ? 'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/mpb_db');

console.log(`\n🔗 Connexion MongoDB...`);
console.log(`📊 URI: ${MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Production)' : 'MongoDB Local'}`);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connecté');
}).catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
});

// ============ CHARGEMENT DES ROUTES AVEC CHEMINS CORRECTS ============
console.log('\n🛣️  Chargement des routes...');

// Mapping spécifique pour vos routes
const routeMapping = {
  'authRoutes': '/api/auth',
  'memberRoutes': '/api/members',
  'adminRoutes': '/api/admin',
  'superAdminRoutes': '/api/super-admin',
  'setupRoutes': '/api/setup',
  'postRoutes': '/api/posts',
  'profileRoutes': '/api/profile',
  'reportRoutes': '/api/reports',
  'contactRoutes': '/api/contact'
};

Object.entries(routeMapping).forEach(([routeFile, routePath]) => {
  const fullPath = path.join(__dirname, 'routes', `${routeFile}.js`);

  if (fs.existsSync(fullPath)) {
    try {
      const route = require(fullPath);
      app.use(routePath, route);
      console.log(`✅ ${routePath} chargé (${routeFile}.js)`);
    } catch (error) {
      console.log(`⚠️  Erreur ${routeFile}:`, error.message);
    }
  } else {
    console.log(`⚠️  ${routeFile}.js non trouvé`);
  }
});

// ============ ROUTES ESSENTIELLES ============

// Route santé
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MPB API - Opérationnel',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    routes: Object.values(routeMapping)
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Mouvement Patriotique du Bénin',
    version: '1.0.0'
  });
});

// Route info API (évite les 404 sur /api/)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MPB API Root',
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      members: 'GET /api/members/all',
      posts: 'GET /api/posts'
    }
  });
});

// ============ ROUTES DE TEST POUR DEBUG ============

// Test pour /api/members/all
app.get('/api/members/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route test /api/members fonctionnelle',
    data: [
      { id: 1, nom: 'Test', prenom: 'User' }
    ]
  });
});

// Test pour /api/posts
app.get('/api/posts/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route test /api/posts fonctionnelle',
    posts: [
      { id: 1, title: 'Test Post', content: 'Contenu test' }
    ]
  });
});

// Route pour voir toutes les routes chargées
app.get('/api/routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });

  res.json({
    success: true,
    routes: routes.filter(r => r.path.startsWith('/api'))
  });
});

// ============ GESTION DES ERREURS ============
app.use('/api/*', (req, res) => {
  console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);

  // Suggérer les routes disponibles
  const availableRoutes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route && middleware.route.path.startsWith('/api')) {
      availableRoutes.push(middleware.route.path);
    }
  });

  res.status(404).json({
    success: false,
    message: 'Endpoint non trouvé',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: availableRoutes.slice(0, 10) // 10 premières
  });
});

app.use((err, req, res, next) => {
  console.error('🔥 Erreur:', err.message);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: IS_PRODUCTION ? undefined : err.message
  });
});

// ============ DÉMARRAGE ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SERVEUR PRÊT !');
  console.log('='.repeat(50));
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Réseau: http://0.0.0.0:${PORT}`);
  console.log('='.repeat(50));

  console.log('\n🔗 Routes disponibles:');
  console.log(`✅ GET  /api/health`);
  console.log(`✅ POST /api/auth/login`);
  console.log(`✅ GET  /api/members/all`);
  console.log(`✅ GET  /api/posts`);
  console.log(`✅ GET  /api/routes (pour debug)`);
  console.log('='.repeat(50));
});

module.exports = app;