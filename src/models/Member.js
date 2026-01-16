const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  // === INFOS PERSONNELLES ===
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  
  // === ÂGE (direct, pas birthYear) ===
  age: {
    type: Number,
    required: [true, 'L\'âge est requis'],
    min: [16, 'Vous devez avoir au moins 16 ans'],
    max: [100, 'Âge maximum 100 ans']
  },
  
  // === CONTACT ===
  code_telephone: {
    type: String,
    default: '+229',
    validate: {
      validator: function(v) {
        return /^\+\d{1,4}$/.test(v);
      },
      message: 'Code pays invalide'
    }
  },
  telephone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true
  },
  
  // === LOCALISATION (1ère partie - formulaire initial) ===
  pays: {
    type: String,
    required: [true, 'Le pays est requis'],
    default: 'Bénin'
  },
  departement: {
    type: String,
    required: function() {
      return this.pays === 'Bénin';
    }
  },
  commune: {
    type: String,
    required: [true, 'La commune est requise']
  },
  
  // === LOCALISATION (à remplir après connexion) ===
  ville: {
    type: String,
    default: ''
  },
  ville_mobilisation: {
    type: String,
    default: ''
  },
  section: {
    type: String,
    default: ''
  },
  centres_interet_competences: {
    type: String,
    default: ''
  },
  
  // === PROFESSION ===
  profession: {
    type: String,
    required: [true, 'La profession est requise'],
    enum: [
      'Étudiant', 'Employé', 'Fonctionnaire', 'Entrepreneur', 'Commerçant',
      'Agriculteur', 'Artisan', 'Profession libérale', 'Retraité', 'Sans emploi', 'Autre'
    ]
  },
  
  // === ENGAGEMENT ===
  disponibilite: {
    type: String,
    required: [true, 'La disponibilité est requise'],
    enum: [
      'Quelques heures par semaine',
      '1-2 jours par semaine',
      '3-4 jours par semaine',
      'Temps plein',
      'Weekends uniquement'
    ]
  },
  motivation: {
    type: String,
    required: [true, 'La motivation est requise'],
    minlength: [20, 'La motivation doit contenir au moins 20 caractères']
  },
  
  // === CONSENTEMENTS ===
  engagement_valeurs_mpb: {
    type: Boolean,
    default: false,
    required: [true, 'L\'engagement aux valeurs MPB est requis']
  },
  consentement_donnees: {
    type: Boolean,
    default: false,
    required: [true, 'Le consentement pour les données est requis']
  },
  
  // === SYSTÈME ===
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères']
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  
  // === IDENTIFICATION ===
  memberId: {
    type: String,
    unique: true
  },
  membershipNumber: {
    type: String,
    unique: true
  },
  
  // === RÔLES ET PERMISSIONS ===
  role: {
    type: String,
    enum: ['member', 'admin', 'super_admin'],
    default: 'member'
  },
  permissions: [{
    type: String,
    enum: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings']
  }],
  
  // === STATUT ===
  status: {
    type: String,
    enum: ['Actif', 'Inactif', 'En attente'],
    default: 'Actif'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // === MÉTADONNÉES ===
  dateInscription: {
    type: Date,
    default: Date.now
  },
  subscriptionDate: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  lastAdminUpdate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  
}, {
  timestamps: true
});

// Middleware pre-save
memberSchema.pre('save', async function(next) {
  // Générer memberId
  if (!this.memberId) {
    this.memberId = 'MPB' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  
  // Générer membershipNumber
  if (!this.membershipNumber) {
    const prefix = 'MPB-';
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const year = new Date().getFullYear();
    this.membershipNumber = `${prefix}${year}-${random}`;
  }
  
  // Date d'inscription formatée
  if (!this.subscriptionDate) {
    this.subscriptionDate = new Date().toLocaleDateString('fr-FR');
  }
  
  // Vérifier si le profil est complet
  const postLoginFields = ['ville', 'ville_mobilisation', 'section', 'centres_interet_competences'];
  const isProfileCompleted = postLoginFields.every(field => 
    this[field] && this[field].trim() !== ''
  );
  this.profileCompleted = isProfileCompleted;
  
  // Hash du mot de passe
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// ==================== SCRIPT D'INCRÉMENTATION D'ÂGE ====================
memberSchema.statics.incrementAges = async function() {
  try {
    const result = await this.updateMany(
      { age: { $lt: 100 } },
      { $inc: { age: 1 } }
    );
    
    console.log(`✅ Âges incrémentés le ${new Date().toLocaleDateString('fr-FR')}`);
    console.log(`📊 Membres mis à jour: ${result.modifiedCount}`);
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'incrémentation des âges:', error);
    throw error;
  }
};

// Méthode pour vérifier le mot de passe
memberSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour mettre à jour le profil post-connexion
memberSchema.methods.updateProfile = async function(profileData) {
  this.ville = profileData.ville || this.ville;
  this.ville_mobilisation = profileData.ville_mobilisation || this.ville_mobilisation;
  this.section = profileData.section || this.section;
  this.centres_interet_competences = profileData.centres_interet_competences || this.centres_interet_competences;
  
  const postLoginFields = ['ville', 'ville_mobilisation', 'section', 'centres_interet_competences'];
  const isProfileCompleted = postLoginFields.every(field => 
    this[field] && this[field].trim() !== ''
  );
  this.profileCompleted = isProfileCompleted;
  
  await this.save();
  return this;
};

// Méthode toJSON pour cacher le mot de passe
memberSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;