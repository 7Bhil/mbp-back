const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import des routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const adminRoutes = require('./routes/adminRoutes');  // Ajoutez cette ligne

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion MongoDB
console.log('🔗 Connexion à MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connecté!');
  console.log(`📊 Base: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);  // Ajoutez cette ligne

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API MPB - Mouvement Patriotique du Bénin',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      members: '/api/members',
      admin: '/api/admin'
    }
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎯 ====================================`);
  console.log(`🚀 Serveur MPB démarré sur le port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`👥 Members: http://localhost:${PORT}/api/members`);
  console.log(`👑 Admin: http://localhost:${PORT}/api/admin`);
  console.log(`🎯 ====================================\n`);
});