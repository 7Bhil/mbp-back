// src/app.js - VERSION SIMPLIFIÉE ET FONCTIONNELLE
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ============ CONFIGURATION DE BASE ============
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

console.log('='.repeat(50));
console.log('🚀 MPB API - En ligne');
console.log('='.repeat(50));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log(`🌍 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log(`🔧 Port: ${PORT}`);

// ============ CORS SIMPLE ============
app.use(cors({
  origin: IS_PRODUCTION 
    ? ['https://mouvementpatriotiquedubenin.netlify.app']
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// ============ MIDDLEWARES ESSENTIELS ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ CONNEXION MONGODB ============
const MONGODB_URI = IS_PRODUCTION
  ? process.env.MONGODB_URI || 'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority'
  : 'mongodb://localhost:27017/mpb_db';

console.log(`\n🔗 Connexion MongoDB...`);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connecté');
}).catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
});

// ============ CHARGEMENT AUTOMATIQUE DES ROUTES ============
console.log('\n🛣️  Chargement des routes...');

const routeFiles = ['authRoutes', 'memberRoutes', 'adminRoutes', 'postRoutes', 'profileRoutes'];

routeFiles.forEach(routeName => {
  const routePath = path.join(__dirname, 'routes', `${routeName}.js`);
  
  if (fs.existsSync(routePath)) {
    try {
      const route = require(routePath);
      app.use(`/api/${routeName.replace('Routes', '').toLowerCase()}`, route);
      console.log(`✅ /api/${routeName.replace('Routes', '').toLowerCase()} chargé`);
    } catch (error) {
      console.log(`⚠️  Erreur ${routeName}:`, error.message);
    }
  } else {
    console.log(`⚠️  ${routeName}.js non trouvé`);
  }
});

// ============ ROUTES ESSENTIELLES ============

// Route santé
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MPB API - Opérationnel',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Mouvement Patriotique du Bénin',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register'
    }
  });
});

// ============ GESTION DES ERREURS ============
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trouvé',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('🔥 Erreur:', err.message);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur'
  });
});

// ============ DÉMARRAGE ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SERVEUR PRÊT !');
  console.log('='.repeat(50));
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Public: http://0.0.0.0:${PORT}`);
  console.log('='.repeat(50));
});

module.exports = app;