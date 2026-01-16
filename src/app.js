const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// ============ CONFIGURATION ============
const isRender = process.env.RENDER || false;
const isDevelopment = process.env.NODE_ENV === 'development';

// Chemin des uploads
const UPLOADS_ROOT = isRender 
  ? path.join('/opt/render/project/uploads')
  : path.join(__dirname, '..', '..', 'uploads');

console.log('📁 Dossier uploads:', UPLOADS_ROOT);
console.log('🌍 Environnement:', isDevelopment ? 'DEVELOPPEMENT' : 'PRODUCTION');

// Nettoyer l'URL client
const cleanClientUrl = process.env.CLIENT_URL ? 
  process.env.CLIENT_URL.replace(/\/$/, '') : '';

// URLs autorisées
const allowedOrigins = isDevelopment
  ? [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ]
  : [
      cleanClientUrl,
      'https://mouvementpatriotiquedubenin.netlify.app',
      'http://mouvementpatriotiquedubenin.netlify.app'
    ].filter(origin => origin);

console.log('🌐 URLs autorisées:', allowedOrigins);

// ============ CORS ============
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `L'origine ${origin} n'est pas autorisée`;
      console.warn('⚠️  CORS bloqué:', msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.options('*', cors());

// ============ MIDDLEWARES ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ DOSSIERS UPLOADS ============
const createUploadsStructure = () => {
  const directories = [
    UPLOADS_ROOT,
    path.join(UPLOADS_ROOT, 'images', 'posts'),
    path.join(UPLOADS_ROOT, 'images', 'members')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Dossier créé: ${path.relative(process.cwd(), dir)}`);
    }
  });
};

createUploadsStructure();

// ============ CONNEXION MONGODB ============
console.log('\n🔗 Configuration MongoDB...');

// URL MongoDB selon l'environnement
let mongoURI;
if (isDevelopment) {
  // FORCÉ en local pour le développement
  mongoURI = 'mongodb://localhost:27017/mpb_db';
  console.log('📊 Mode: DÉVELOPPEMENT (MongoDB local forcé)');
} else {
  // En production, utiliser l'URL de l'environnement ou une valeur par défaut
  mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mpb_db';
  console.log('📊 Mode: PRODUCTION');
}

console.log(`🔗 URL MongoDB: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Configuration optimale
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  ...(isDevelopment ? { 
    // Options spécifiques au développement
    family: 4 // Force IPv4 pour éviter les problèmes de résolution
  } : {})
};

// ============ FONCTION DE CRÉATION ADMIN (DÉPLACÉE AVANT LA CONNEXION) ============
async function createDefaultAdmin() {
  try {
    console.log('\n👑 ===== DÉBUT CRÉATION ADMIN =====');
    console.log('📊 État MongoDB:', mongoose.connection.readyState);
    console.log('📁 Base:', mongoose.connection.name);
    
    // Vérifier connexion MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ MongoDB pas encore connecté');
      console.log('🔄 Réessai dans 5 secondes...');
      setTimeout(createDefaultAdmin, 5000);
      return;
    }
    
    console.log('✅ MongoDB connecté, chargement du modèle...');
    
    // Charger le modèle APRÈS la connexion
    const Member = mongoose.model('Member') || require('./models/Member');
    console.log('✅ Modèle Member chargé');
    
    // Vérifier si admin existe déjà
    try {
      console.log('🔍 Recherche admin existant...');
      const existingAdmin = await Member.findOne({ 
        email: 'admin@gmail.com',
        role: 'admin' 
      });
      
      if (existingAdmin) {
        console.log('✅ Admin déjà existant:');
        console.log('   📧', existingAdmin.email);
        console.log('   👤', existingAdmin.prenom, existingAdmin.nom);
        console.log('   🆔', existingAdmin.memberId);
        console.log('   🎯 Rôle:', existingAdmin.role);
        console.log('   🔑 Password hash présent:', existingAdmin.password ? 'OUI' : 'NON');
        console.log('👑 ===== FIN CRÉATION ADMIN =====\n');
        return;
      }
    } catch (findError) {
      console.log('⚠️  Erreur recherche admin:', findError.message);
    }
    
    // Si aucun admin trouvé, en créer un
    console.log('👑 Création du compte administrateur par défaut...');
    
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
      password: 'admin123', // MOT DE PASSE EN CLAIR - sera hashé par le middleware
      role: 'admin',
      permissions: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings'],
      status: 'Actif',
      isActive: true,
      profileCompleted: true
    };
    
    console.log('📝 Données admin préparées');
    console.log('🔑 Mot de passe fourni:', adminData.password);
    
    try {
      const admin = new Member(adminData);
      console.log('💾 Sauvegarde admin...');
      await admin.save();
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 NOUVEL ADMIN CRÉÉ !');
      console.log('='.repeat(60));
      console.log('📧 Email:', admin.email);
      console.log('🔑 Mot de passe: admin123');
      console.log('🆔 Member ID:', admin.memberId);
      console.log('🔢 Membership:', admin.membershipNumber);
      console.log('🔐 Hash généré:', admin.password.substring(0, 30) + '...');
      console.log('👤 Âge:', admin.age);
      console.log('📍 Département:', admin.departement);
      console.log('='.repeat(60));
      
      // TEST IMMÉDIAT
      console.log('\n🧪 Test de vérification:');
      const testAdmin = await Member.findOne({ email: 'admin@gmail.com' });
      if (testAdmin) {
        console.log('✅ Admin retrouvé en base');
        console.log('🔑 Hash en base:', testAdmin.password.substring(0, 30) + '...');
        
        // Test de comparaison de mot de passe
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare('admin123', testAdmin.password);
        console.log('🔐 Test mot de passe:', isPasswordValid ? '✅ VALIDE' : '❌ INVALIDE');
        
        if (!isPasswordValid) {
          console.log('⚠️  ATTENTION: Le mot de passe ne correspond pas au hash!');
          console.log('   Essayez de vous connecter avec ces identifiants:');
          console.log('   Email: admin@gmail.com');
          console.log('   Password: admin123');
        }
      }
      
      console.log('👑 ===== FIN CRÉATION ADMIN =====\n');
      
    } catch (saveError) {
      console.error('❌ Erreur sauvegarde admin:', saveError.message);
      if (saveError.errors) {
        Object.keys(saveError.errors).forEach(key => {
          console.error(`   - ${key}:`, saveError.errors[key].message);
        });
      }
      if (saveError.code === 11000) {
        console.log('ℹ️  Admin existe déjà (erreur de duplication)');
      }
      console.error('🔧 Stack:', saveError.stack);
    }
    
  } catch (error) {
    console.error('🔥 ERREUR CRITIQUE création admin:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

// ============ CONNEXION ET DÉMARRAGE ============
async function startServer() {
  try {
    // Connexion MongoDB
    await mongoose.connect(mongoURI, mongooseOptions);
    
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const dbName = mongoose.connection.name;
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      console.log(`✅ MongoDB LOCAL connecté avec succès!`);
    } else {
      console.log(`✅ MongoDB CLOUD (${host}) connecté avec succès!`);
    }
    
    console.log(`📊 Base: ${dbName}`);
    console.log(`📍 Hôte: ${host}`);
    if (port) console.log(`🔢 Port: ${port}`);

    // ============ GESTION DES ÉVÉNEMENTS MONGODB ============
    mongoose.connection.on('connected', () => {
      console.log('✅ Événement: MongoDB connecté');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Événement: MongoDB déconnecté');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err.message);
    });

    // ============ CHARGEMENT DU MODÈLE AVANT LES ROUTES ============
    console.log('\n📦 Chargement des modèles...');
    require('./models/Member'); // Charger le modèle une fois
    
    // ============ ROUTES ============
    // Service statique pour les uploads
    app.use('/uploads', express.static(UPLOADS_ROOT));

    // Route santé avec infos détaillées
    app.get('/api/health', async (req, res) => {
      try {
        const Member = mongoose.model('Member');
        let adminInfo = null;
        let memberCount = 0;
        let completedProfiles = 0;
        let activeMembers = 0;
        let dbStatus = 'unknown';
        
        const dbState = mongoose.connection.readyState;
        switch(dbState) {
          case 0: dbStatus = 'disconnected'; break;
          case 1: dbStatus = 'connected'; break;
          case 2: dbStatus = 'connecting'; break;
          case 3: dbStatus = 'disconnecting'; break;
        }
        
        if (dbState === 1) {
          try {
            const admin = await Member.findOne({ 
              email: 'admin@gmail.com',
              role: 'admin' 
            });
            
            if (admin) {
              adminInfo = {
                email: admin.email,
                name: `${admin.prenom} ${admin.nom}`,
                memberId: admin.memberId,
                membershipNumber: admin.membershipNumber,
                age: admin.age,
                role: admin.role,
                status: admin.status,
                profileCompleted: admin.profileCompleted,
                lastLogin: admin.lastLogin
              };
            }
            
            memberCount = await Member.countDocuments();
            completedProfiles = await Member.countDocuments({ profileCompleted: true });
            activeMembers = await Member.countDocuments({ isActive: true });
            
          } catch (dbError) {
            console.log('ℹ️  Impossible de récupérer les infos DB:', dbError.message);
          }
        }
        
        res.json({
          success: true,
          message: 'API MPB - Mouvement Patriotique du Bénin',
          timestamp: new Date().toISOString(),
          environment: isDevelopment ? 'development' : 'production',
          server: {
            port: process.env.PORT || 5000,
            uploadsPath: UPLOADS_ROOT,
            nodeEnv: process.env.NODE_ENV,
            status: 'online'
          },
          database: {
            status: dbStatus,
            state: dbState,
            name: mongoose.connection.name || 'N/A',
            host: mongoose.connection.host || 'N/A',
            port: mongoose.connection.port || 'N/A',
            admin: adminInfo,
            membersCount: memberCount,
            completedProfiles: completedProfiles,
            activeMembers: activeMembers,
            isLocal: mongoose.connection.host ? 
              mongoose.connection.host.includes('localhost') || mongoose.connection.host.includes('127.0.0.1') 
              : null
          },
          client: {
            url: cleanClientUrl,
            corsEnabled: true
          },
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
      console.log('✅ Routes API chargées');
    } catch (error) {
      console.log('⚠️ Certaines routes non chargées:', error.message);
    }

    // Route racine
    app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Bienvenue sur l\'API du Mouvement Patriotique du Bénin',
        version: '1.0.0',
        environment: isDevelopment ? 'development' : 'production',
        database: mongoose.connection.readyState === 1 ? 
          `Connected to ${mongoose.connection.host}` : 
          'Disconnected',
        endpoints: {
          api: `http://${req.headers.host}/api/health`,
          documentation: 'Consultez /api/health pour plus d\'informations'
        }
      });
    });

    // Route 404
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint API non trouvé',
        requestedUrl: req.originalUrl
      });
    });

    // Gestion des erreurs globales
    app.use((err, req, res, next) => {
      console.error('🔥 Erreur serveur:', err.message);
      if (isDevelopment) {
        console.error('Stack:', err.stack);
      }
      
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur serveur',
        ...(isDevelopment && { stack: err.stack })
      });
    });

    // ============ DÉMARRAGE DU SERVEUR ============
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`\n🎯 ==============================================`);
      console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🌍 Client: ${cleanClientUrl || 'Non défini'}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
      console.log(`🎯 ==============================================\n`);
      
      // Créer l'admin après un délai pour s'assurer que tout est chargé
      setTimeout(() => {
        createDefaultAdmin();
      }, 2000);
    });

  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error.message);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

module.exports = app;