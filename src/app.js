const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// ============ CONFIGURATION ============
const isRender = process.env.RENDER || false;
const UPLOADS_ROOT = isRender 
  ? path.join('/opt/render/project/uploads')
  : path.join(__dirname, '..', '..', 'uploads');

console.log('📁 Dossier uploads:', UPLOADS_ROOT);
console.log('🌍 Environnement:', process.env.NODE_ENV || 'development');

// Nettoyer l'URL client
const cleanClientUrl = process.env.CLIENT_URL ? 
  process.env.CLIENT_URL.replace(/\/$/, '') : '';

// URLs autorisées
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  cleanClientUrl,
  'https://mouvementpatriotiquedubenin.netlify.app',
  'http://mouvementpatriotiquedubenin.netlify.app'
].filter((origin, index, self) => origin && self.indexOf(origin) === index);

console.log('🌐 URLs autorisées:', allowedOrigins);

// ============ CORS ============
app.use(cors({
  origin: allowedOrigins,
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
      console.log(`✅ Dossier créé: ${path.basename(dir)}`);
    }
  });
};

createUploadsStructure();

// ============ CONNEXION MONGODB ============
console.log('\n🔗 Connexion MongoDB...');

const mongoURI = process.env.MONGODB_URI || 
  'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority';

// Configuration optimale pour MongoDB Atlas
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
})
.then(() => {
  console.log('✅ MongoDB Atlas connecté avec succès!');
  console.log(`📊 Base: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
});

// ============ CRÉATION ADMIN AMÉLIORÉE ============
async function createDefaultAdmin() {
  try {
    console.log('\n👑 Vérification du compte administrateur...');
    
    // Attendre que MongoDB soit prêt
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ En attente de MongoDB...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️  MongoDB non disponible');
        return;
      }
    }
    
    const Member = require('./models/Member');
    
    // Vérifier si admin existe déjà
    try {
      const existingAdmin = await Member.findOne({ email: 'admin@gmail.com' });
      
      if (existingAdmin) {
        console.log('✅ Admin déjà existant:');
        console.log(`   📧 ${existingAdmin.email}`);
        console.log(`   👤 ${existingAdmin.prenom} ${existingAdmin.nom}`);
        console.log(`   🆔 ${existingAdmin.memberId}`);
        console.log(`   🎯 Rôle: ${existingAdmin.role}`);
        return;
      }
    } catch (findError) {
      console.log('ℹ️  Vérification admin:', findError.message);
    }
    
    // Si aucun admin trouvé, en créer un
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
      motivation: 'Compte administrateur principal du Mouvement Patriotique du Bénin.',
      password: 'admin123',
      role: 'admin',
      status: 'Actif',
      isActive: true
    };
    
    // Utiliser upsert pour éviter l'erreur de duplication
    try {
      const admin = new Member(adminData);
      await admin.save();
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 NOUVEL ADMIN CRÉÉ !');
      console.log('='.repeat(60));
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Mot de passe: admin123');
      console.log('🆔 Member ID:', admin.memberId);
      console.log('🔢 Membership:', admin.membershipNumber);
      console.log('='.repeat(60));
    } catch (saveError) {
      if (saveError.code === 11000) {
        // Erreur de duplication - c'est normal, l'admin existe déjà
        console.log('ℹ️  Admin existe déjà (erreur de duplication ignorée)');
      } else {
        console.error('⚠️  Erreur création admin:', saveError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur fonction admin:', error.message);
  }
}

// Événement quand MongoDB est connecté
mongoose.connection.on('connected', () => {
  console.log('✅ Événement: MongoDB connecté');
  
  // Attendre un peu puis créer l'admin
  setTimeout(createDefaultAdmin, 1500);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err.message);
});

// ============ ROUTES ============
// Service statique
app.use('/uploads', express.static(UPLOADS_ROOT));

// Route santé avec infos détaillées
app.get('/api/health', async (req, res) => {
  try {
    const Member = require('./models/Member');
    let adminInfo = null;
    let memberCount = 0;
    
    if (mongoose.connection.readyState === 1) {
      try {
        const admin = await Member.findOne({ email: 'admin@gmail.com' });
        if (admin) {
          adminInfo = {
            email: admin.email,
            name: `${admin.prenom} ${admin.nom}`,
            memberId: admin.memberId,
            role: admin.role,
            status: admin.status
          };
        }
        
        memberCount = await Member.countDocuments();
      } catch (dbError) {
        console.log('ℹ️  Impossible de récupérer les infos DB:', dbError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'API MPB - Mouvement Patriotique du Bénin',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        port: process.env.PORT || 5000,
        uploadsPath: UPLOADS_ROOT,
        status: 'online'
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name || 'N/A',
        admin: adminInfo,
        membersCount: memberCount
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
        health: '/api/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Charger les routes API
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/members', require('./routes/memberRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/posts', require('./routes/postRoutes'));
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
    endpoints: {
      api: 'http://' + req.headers.host + '/api/health',
      documentation: 'Voir /api/health pour plus d\'informations'
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
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============ DÉMARRAGE ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🎯 ==============================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌍 Client: ${cleanClientUrl || 'Non défini'}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
  console.log(`🎯 ==============================================\n`);
  
  // Si MongoDB est déjà connecté au démarrage
  if (mongoose.connection.readyState === 1) {
    setTimeout(createDefaultAdmin, 1000);
  }
});

module.exports = app;