const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// ============ DÉTECTION DE L'ENVIRONNEMENT ============
const IS_RENDER = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL !== undefined;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;

console.log('🚀 ===== DÉMARRAGE SERVEUR MPB =====');
console.log(`🌍 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
console.log(`🏢 Plateforme: ${IS_RENDER ? 'Render' : 'Local'}`);
console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
console.log('=====================================\n');

// ============ CONFIGURATION MONGODB ============
console.log('🔗 CONFIGURATION MONGODB');
console.log('─'.repeat(40));

// URL MONGODB - LOGIQUE AMÉLIORÉE
let MONGODB_URI;

// 1. TOUJOURS vérifier la variable d'environnement d'abord
if (process.env.MONGODB_URI) {
  MONGODB_URI = process.env.MONGODB_URI;
  console.log('✅ MONGODB_URI trouvée dans les variables d\'environnement');
} else if (IS_PRODUCTION) {
  // En production, on DOIT avoir MONGODB_URI
  console.error('❌ ERREUR CRITIQUE: MONGODB_URI non définie en production!');
  console.log('🔧 Configuration nécessaire sur Render:');
  console.log('   1. Allez dans votre service Render');
  console.log('   2. Cliquez sur "Environment"');
  console.log('   3. Ajoutez cette variable:');
  console.log('      Clé: MONGODB_URI');
  console.log('      Valeur: mongodb+srv://USER:PASSWORD@cluster.mongodb.net/mpb_db?retryWrites=true&w=majority');
  console.log('\n⚠️  Utilisation d\'une URL par défaut pour éviter le crash...');
  
  // URL MongoDB Atlas par défaut
  MONGODB_URI = 'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority';
} else {
  // Développement local
  MONGODB_URI = 'mongodb://localhost:27017/mpb_db';
  console.log('🔧 Mode développement: MongoDB local');
}

// Masquer les informations sensibles dans les logs
const maskedURI = MONGODB_URI.replace(
  /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 
  'mongodb$1://***:***@'
);
console.log(`📡 URL MongoDB: ${maskedURI}`);
console.log(`🔒 Type: ${MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'MongoDB Local'}`);

// Configuration Mongoose optimisée
const MONGOOSE_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: IS_PRODUCTION ? 30000 : 10000,
  connectTimeoutMS: IS_PRODUCTION ? 40000 : 15000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
  ...(MONGODB_URI.includes('mongodb+srv') ? {
    ssl: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false
  } : {
    family: 4
  })
};

// ============ FONCTION DE CONNEXION MONGODB ============
async function connectToMongoDB() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000;
  
  console.log(`\n🔄 TENTATIVE DE CONNEXION MONGODB (max ${MAX_RETRIES} tentatives)`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`   └─ Tentative ${attempt}/${MAX_RETRIES}...`);
      
      await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
      
      // Vérifier la connexion
      await mongoose.connection.db.admin().ping();
      
      console.log('   └─ ✅ CONNEXION RÉUSSIE!');
      console.log(`   └─ 📊 Base de données: ${mongoose.connection.name}`);
      console.log(`   └─ 🌐 Hôte: ${mongoose.connection.host}`);
      
      // Configurer les écouteurs d'événements
      mongoose.connection.on('connected', () => {
        console.log('   └─ 📡 Événement: MongoDB connecté');
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('   └─ ⚠️  Événement: MongoDB déconnecté');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('   └─ ❌ Erreur MongoDB:', err.message);
      });
      
      return true;
      
    } catch (error) {
      console.error(`   └─ ❌ Tentative ${attempt} échouée: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        console.log(`   └─ ⏳ Nouvelle tentative dans ${RETRY_DELAY/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error('\n❌ ÉCHEC CRITIQUE: Impossible de se connecter à MongoDB');
        
        // Diagnostic détaillé
        console.log('\n🔍 DIAGNOSTIC:');
        console.log('─'.repeat(40));
        
        if (MONGODB_URI.includes('mongodb+srv')) {
          console.log('Problème probable avec MongoDB Atlas:');
          console.log('1. Vérifiez votre URI de connexion');
          console.log('2. Vérifiez les accès réseau sur MongoDB Atlas');
          console.log('3. Vérifiez vos identifiants');
        } else {
          console.log('Problème probable avec MongoDB local:');
          console.log('1. Vérifiez que MongoDB est en cours d\'exécution');
          console.log('2. Commandes de démarrage:');
          console.log('   - Linux/Mac: sudo systemctl start mongod');
          console.log('   - Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
        }
        
        return false;
      }
    }
  }
}

// ============ CONFIGURATION CORS ============
console.log('\n🌐 CONFIGURATION CORS');
console.log('─'.repeat(40));

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

console.log(`Origines autorisées: ${ALLOWED_ORIGINS.join(', ')}`);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`⚠️  CORS bloqué: Origine "${origin}" non autorisée`);
      return callback(new Error(`Origine "${origin}" non autorisée par CORS`), false);
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

// ============ CONFIGURATION UPLOADS ============
console.log('\n📁 CONFIGURATION UPLOADS');
console.log('─'.repeat(40));

const UPLOADS_ROOT = IS_RENDER 
  ? '/opt/render/project/src/uploads'
  : path.join(__dirname, 'uploads');

console.log(`Dossier uploads: ${UPLOADS_ROOT}`);
console.log(`Existe: ${fs.existsSync(UPLOADS_ROOT) ? '✅ OUI' : '❌ NON'}`);

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
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Dossier créé: ${dir}`);
      } catch (error) {
        console.error(`❌ Erreur création dossier ${dir}:`, error.message);
      }
    } else {
      console.log(`📁 Dossier existant: ${dir}`);
    }
  });
};

createUploadsStructure();

// Service statique pour les uploads
app.use('/uploads', express.static(UPLOADS_ROOT));
console.log(`📡 Route statique: /uploads -> ${UPLOADS_ROOT}`);

// ============ ROUTE SANTÉ ============
app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['déconnecté', 'connecté', 'connexion', 'déconnexion'][dbState];
    
    const healthInfo = {
      success: true,
      message: 'API MPB - Serveur en ligne',
      timestamp: new Date().toISOString(),
      environment: IS_PRODUCTION ? 'production' : 'development',
      platform: IS_RENDER ? 'render' : 'local',
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version,
        port: process.env.PORT || 5000
      },
      database: {
        status: dbStatus,
        state: dbState,
        name: mongoose.connection.name || 'N/A',
        host: mongoose.connection.host || 'N/A',
        models: Object.keys(mongoose.connection.models)
      },
      system: {
        cpus: require('os').cpus().length,
        arch: process.arch,
        platform: process.platform
      }
    };
    
    res.json(healthInfo);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur santé serveur',
      error: IS_DEVELOPMENT ? error.message : undefined
    });
  }
});

// ============ FONCTION CRÉATION ADMIN ============
async function createDefaultAdmin() {
  try {
    console.log('\n👑 CRÉATION/VERIFICATION ADMIN');
    console.log('─'.repeat(40));
    
    // Vérifier que MongoDB est connecté
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ MongoDB pas prêt, réessai dans 3s...');
      setTimeout(createDefaultAdmin, 3000);
      return;
    }
    
    // Charger le modèle
    const Member = require('./models/Member');
    
    // Vérifier si admin existe déjà
    const existingAdmin = await Member.findOne({ 
      email: 'admin@gmail.com',
      role: 'admin' 
    });
    
    if (existingAdmin) {
      console.log('✅ Admin déjà existant:');
      console.log(`   📧 ${existingAdmin.email}`);
      console.log(`   👤 ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log(`   🆔 ${existingAdmin.memberId}`);
      console.log(`   🔐 Mot de passe: ${existingAdmin.password ? 'défini' : 'non défini'}`);
      return;
    }
    
    // Créer le compte admin
    console.log('👑 Création du compte administrateur...');
    
    const adminData = {
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@gmail.com',
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
      password: 'admin123',
      role: 'admin',
      permissions: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings'],
      status: 'Actif',
      isActive: true,
      profileCompleted: true
    };
    
    const admin = new Member(adminData);
    await admin.save();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMINISTRATEUR CRÉÉ AVEC SUCCÈS!');
    console.log('='.repeat(60));
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Mot de passe: admin123');
    console.log('🆔 Member ID:', admin.memberId);
    console.log('🔢 Membership:', admin.membershipNumber);
    console.log('🔐 Hash généré:', admin.password.substring(0, 30) + '...');
    console.log('='.repeat(60));
    
  } catch (error) {
    if (error.code === 11000) {
      console.log('ℹ️  Admin existe déjà (duplication ignorée)');
    } else {
      console.error('❌ Erreur création admin:', error.message);
    }
  }
}

// ============ CHARGEMENT DES ROUTES ============
console.log('\n🛣️  CHARGEMENT DES ROUTES');
console.log('─'.repeat(40));

const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: 'authRoutes' },
    { path: '/api/members', file: 'memberRoutes' },
    { path: '/api/admin', file: 'adminRoutes' },
    { path: '/api/posts', file: 'postRoutes' },
    { path: '/api/profile', file: 'profileRoutes' }
  ];
  
  routes.forEach(route => {
    try {
      app.use(route.path, require(`./routes/${route.file}`));
      console.log(`✅ Route chargée: ${route.path}`);
    } catch (error) {
      console.error(`❌ Erreur chargement route ${route.path}:`, error.message);
    }
  });
};

// ============ ROUTES DE BASE ============
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API du Mouvement Patriotique du Bénin',
    version: '1.0.0',
    environment: IS_PRODUCTION ? 'production' : 'development',
    documentation: `${req.protocol}://${req.get('host')}/api/health`,
    endpoints: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/members/profile',
      '/api/admin/members'
    ]
  });
});

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
      '/api/members/profile',
      '/api/admin/members'
    ]
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('🔥 Erreur serveur:', err.message);
  
  const response = {
    success: false,
    message: err.message || 'Erreur serveur interne'
  };
  
  if (IS_DEVELOPMENT) {
    response.stack = err.stack;
  }
  
  res.status(err.status || 500).json(response);
});

// ============ DÉMARRAGE DU SERVEUR ============
async function startServer() {
  try {
    console.log('\n🚀 DÉMARRAGE DU SERVEUR');
    console.log('─'.repeat(40));
    
    // 1. Connexion MongoDB
    console.log('Étape 1/3: Connexion à MongoDB...');
    const mongoConnected = await connectToMongoDB();
    
    if (!mongoConnected) {
      console.error('❌ Échec critique: Impossible de se connecter à MongoDB');
      
      if (IS_DEVELOPMENT) {
        console.warn('⚠️  Mode développement: Continuation sans MongoDB');
      } else {
        console.error('❌ Production: Arrêt du serveur');
        process.exit(1);
      }
    }
    
    // 2. Charger les routes
    console.log('\nÉtape 2/3: Chargement des routes...');
    loadRoutes();
    
    // 3. Démarrer le serveur HTTP
    console.log('\nÉtape 3/3: Démarrage du serveur HTTP...');
    
    const PORT = process.env.PORT || 5000;
    const HOST = IS_RENDER ? '0.0.0.0' : 'localhost';
    
    app.listen(PORT, HOST, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 SERVEUR MPB DÉMARRÉ AVEC SUCCÈS!');
      console.log('='.repeat(60));
      console.log(`📡 URL: http://${HOST}:${PORT}`);
      console.log(`🌍 Environnement: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);
      console.log(`🏢 Plateforme: ${IS_RENDER ? 'Render' : 'Local'}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
      
      if (mongoose.connection.readyState === 1) {
        console.log(`   └─ Base: ${mongoose.connection.name}`);
        console.log(`   └─ Hôte: ${mongoose.connection.host}`);
      }
      
      console.log(`👑 Admin: admin@gmail.com / admin123`);
      console.log(`📁 Uploads: ${UPLOADS_ROOT}`);
      console.log('='.repeat(60));
      console.log('\n🔗 Liens utiles:');
      console.log(`   ✅ Santé: http://${HOST}:${PORT}/api/health`);
      console.log(`   📚 Documentation: http://${HOST}:${PORT}/`);
      console.log('\n🛠️  Commande de test:');
      console.log(`   curl http://${HOST}:${PORT}/api/health`);
    });
    
    // 4. Créer l'admin après démarrage
    setTimeout(() => {
      if (mongoose.connection.readyState === 1) {
        createDefaultAdmin();
      } else {
        console.log('⏳ MongoDB non connecté, report création admin...');
        setTimeout(() => createDefaultAdmin(), 5000);
      }
    }, 2000);
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE DÉMARRAGE SERVEUR');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// ============ GESTION DES SIGNNAUX ============
process.on('SIGINT', () => {
  console.log('\n\n🛑 Réception SIGINT - Arrêt gracieux...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Réception SIGTERM - Arrêt gracieux...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ EXCEPTION NON GÉRÉE:', error.message);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ REJET NON GÉRÉ:', reason);
});

// ============ DÉMARRER LE SERVEUR ============
startServer();

module.exports = app;