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

console.log('🚀 Démarrage du serveur MPB');
console.log(`🌍 Environnement: ${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log(`🏢 Plateforme: ${isRender ? 'Render' : 'Local'}`);

// ============ CONFIGURATION MONGODB ============
console.log('\n🔗 Configuration MongoDB...');

// URL MongoDB - PRIORITÉ ABSOLUE À L'ENVIRONNEMENT
let mongoURI;

if (isProduction) {
  // EN PRODUCTION : Utiliser l'URL de MongoDB Atlas
  mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ ERREUR CRITIQUE: MONGODB_URI non défini en production!');
    console.log('🔧 Pour déployer sur Render:');
    console.log('   1. Créez un cluster sur MongoDB Atlas (gratuit)');
    console.log('   2. Obtenez votre URI de connexion');
    console.log('   3. Sur Render > Environment > Ajoutez:');
    console.log('      MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mpb_db');
    console.log('      NODE_ENV=production');
    process.exit(1);
  }
  
  console.log('📊 Mode: PRODUCTION (MongoDB Atlas)');
  
} else {
  // EN DÉVELOPPEMENT : MongoDB local
  mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
  console.log('📊 Mode: DÉVELOPPEMENT (MongoDB local)');
}

// Masquer le mot de passe dans les logs
const maskedURI = mongoURI ? mongoURI.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://***:***@') : 'undefined';
console.log(`🔗 URL MongoDB: ${maskedURI}`);

// Configuration mongoose
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // Augmenté pour Render
  connectTimeoutMS: 30000, // Augmenté pour Render
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
  const retryDelay = 5000; // 5 secondes
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative de connexion ${attempt}/${maxRetries}...`);
      
      await mongoose.connect(mongoURI, mongooseOptions);
      
      const conn = mongoose.connection;
      console.log(`✅ MongoDB connecté avec succès!`);
      console.log(`📊 Base: ${conn.name}`);
      console.log(`📍 Hôte: ${conn.host}`);
      console.log(`🔢 Port: ${conn.port || 'N/A'}`);
      
      // Événements MongoDB
      conn.on('connected', () => console.log('📡 MongoDB: Connecté'));
      conn.on('disconnected', () => console.log('⚠️  MongoDB: Déconnecté'));
      conn.on('error', (err) => console.error('❌ MongoDB Erreur:', err.message));
      
      return true;
      
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Nouvelle tentative dans ${retryDelay/1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Impossible de se connecter à MongoDB après plusieurs tentatives');
        
        if (isProduction) {
          console.log('\n🔧 DIAGNOSTIC PRODUCTION:');
          console.log('1. Vérifiez votre URI MongoDB Atlas:');
          console.log('   - Format: mongodb+srv://USER:PASSWORD@cluster.mongodb.net/DB_NAME');
          console.log('2. Vérifiez l\'accès réseau sur MongoDB Atlas:');
          console.log('   - Network Access > Add IP Address > 0.0.0.0/0');
          console.log('3. Vérifiez vos variables sur Render:');
          console.log('   - NODE_ENV=production');
          console.log('   - MONGODB_URI=votre_uri_complet');
        } else {
          console.log('\n🔧 DIAGNOSTIC LOCAL:');
          console.log('1. Vérifiez que MongoDB est installé: mongod --version');
          console.log('2. Démarrez MongoDB:');
          console.log('   - macOS: brew services start mongodb-community');
          console.log('   - Linux: sudo systemctl start mongod');
          console.log('   - Windows: net start MongoDB');
          console.log('3. Ou utilisez Docker:');
          console.log('   docker run -d -p 27017:27017 --name mongodb mongo:latest');
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
      'http://127.0.0.1:5174'
    ]
  : [
      'https://mouvementpatriotiquedubenin.netlify.app',
      'http://mouvementpatriotiquedubenin.netlify.app'
    ];

console.log('\n🌐 Configuration CORS:');
console.log('Origines autorisées:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (curl, postman, serveur à serveur)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `Origine non autorisée: ${origin}`;
      console.warn('⚠️  CORS bloqué:', msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ DOSSIERS UPLOADS ============
let UPLOADS_ROOT;

if (isRender) {
  // Sur Render, utiliser le chemin absolu
  UPLOADS_ROOT = '/opt/render/project/uploads';
} else {
  // En local, chemin relatif
  UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
}

console.log(`📁 Dossier uploads: ${UPLOADS_ROOT}`);

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
    console.log('\n👑 Vérification du compte administrateur...');
    
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ MongoDB pas encore prêt, réessai dans 3s...');
      setTimeout(createDefaultAdmin, 3000);
      return;
    }
    
    const Member = require('./models/Member');
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await Member.findOne({ 
      email: 'admin@mpb.bj',
      role: 'admin' 
    });
    
    if (existingAdmin) {
      console.log('✅ Admin déjà existant:');
      console.log(`   📧 ${existingAdmin.email}`);
      console.log(`   👤 ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log(`   🆔 ${existingAdmin.memberId}`);
      console.log(`   🎯 Rôle: ${existingAdmin.role}`);
      return;
    }
    
    // Créer le compte admin
    console.log('👑 Création du compte administrateur...');
    
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
      password: 'AdminMPB2024!', // Mot de passe fort
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
    }
  }
}

// ============ ROUTES ============
// Route santé pour vérifier le serveur
app.get('/api/health', async (req, res) => {
  try {
    const Member = require('./models/Member');
    const dbState = mongoose.connection.readyState;
    
    let dbInfo = {
      status: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState],
      state: dbState,
      name: mongoose.connection.name || 'N/A',
      host: mongoose.connection.host || 'N/A'
    };
    
    let adminInfo = null;
    let stats = {};
    
    if (dbState === 1) {
      try {
        // Vérifier l'admin
        const admin = await Member.findOne({ email: 'admin@mpb.bj', role: 'admin' });
        if (admin) {
          adminInfo = {
            email: admin.email,
            name: `${admin.prenom} ${admin.nom}`,
            memberId: admin.memberId,
            role: admin.role,
            profileCompleted: admin.profileCompleted
          };
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
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      server: {
        port: process.env.PORT || 5000,
        nodeEnv: process.env.NODE_ENV,
        uploadsPath: UPLOADS_ROOT,
        status: 'online'
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
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: isDevelopment ? error.message : undefined
    });
  }
});

// Charger les routes API
console.log('\n🛣️  Chargement des routes...');
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/members', require('./routes/memberRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/posts', require('./routes/postRoutes'));
  app.use('/api/profile', require('./routes/profileRoutes'));
  console.log('✅ Routes API chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes:', error.message);
  // Ne pas arrêter le serveur si certaines routes échouent
}

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API du Mouvement Patriotique du Bénin',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
    documentation: `http://${req.headers.host}/api/health`,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      members: '/api/members',
      admin: '/api/admin'
    }
  });
});

// Route 404 pour API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API non trouvé',
    requestedUrl: req.originalUrl,
    availableEndpoints: ['/api/health', '/api/auth', '/api/members', '/api/admin', '/api/posts', '/api/profile']
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('🔥 Erreur serveur:', err.message);
  
  const errorResponse = {
    success: false,
    message: err.message || 'Erreur serveur interne'
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
    console.log('\n🚀 Démarrage du serveur MPB...');
    
    // 1. Connexion MongoDB
    const mongoConnected = await connectToMongoDB();
    if (!mongoConnected) {
      console.error('❌ Impossible de démarrer sans connexion MongoDB');
      process.exit(1);
    }
    
    // 2. Créer l'admin après un délai
    setTimeout(() => {
      createDefaultAdmin();
    }, 2000);
    
    // 3. Démarrer le serveur HTTP
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🎉 SERVEUR MPB DÉMARRÉ AVEC SUCCÈS !`);
      console.log('='.repeat(60));
      console.log(`📡 URL: http://0.0.0.0:${PORT}`);
      console.log(`🌍 Environnement: ${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
      console.log(`🏢 Plateforme: ${isRender ? 'Render' : 'Local'}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
      console.log(`👑 Admin: admin@mpb.bj / AdminMPB2024!`);
      console.log('='.repeat(60));
      console.log('\n🔍 Testez le serveur:');
      console.log(`   curl http://localhost:${PORT}/api/health`);
      console.log('\n🛠️  Pour déploiement:');
      console.log('   1. Configurez MONGODB_URI avec votre URI Atlas');
      console.log('   2. Définissez NODE_ENV=production');
      console.log('   3. Ajoutez JWT_SECRET et autres variables');
    });
    
  } catch (error) {
    console.error('❌ Erreur critique démarrage serveur:', error.message);
    console.error('🔧 Stack:', error.stack);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

module.exports = app;