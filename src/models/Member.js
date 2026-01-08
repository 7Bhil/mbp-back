const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  // Informations personnelles
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
  
  // Identifiants
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères']
  },
  
  // Contact
  phoneCode: {
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
  
  // Localisation
  pays: {
    type: String,
    required: [true, 'Le pays est requis'],
    default: 'Bénin'
  },
  department: {
    type: String,
    required: function() {
      return this.pays === 'Bénin';
    }
  },
  commune: {
    type: String,
    required: [true, 'La commune est requise']
  },
  
  // Démographie
  birthYear: {
    type: Number,
    required: [true, 'L\'année de naissance est requise'],
    min: [1900, 'Année de naissance invalide'],
    max: [new Date().getFullYear() - 16, 'Vous devez avoir au moins 16 ans']
  },
  age: {
    type: Number
  },
  
  // Profession
  profession: {
    type: String,
    required: [true, 'La profession est requise'],
    enum: [
      'Étudiant', 'Employé', 'Fonctionnaire', 'Entrepreneur', 'Commerçant',
      'Agriculteur', 'Artisan', 'Profession libérale', 'Retraité', 'Sans emploi', 'Autre'
    ]
  },
  
  // Engagement
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
  
  // Système
  memberId: {
    type: String,
    unique: true
  },
  membershipNumber: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['Actif', 'Inactif', 'En attente'],
    default: 'Actif'
  },
  
  // Métadonnées
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
   role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  
  // Permissions spécifiques (optionnel)
  permissions: [{
    type: String,
    enum: ['view_members', 'edit_members', 'delete_members', 'create_events', 'manage_settings']
  }],
  
  // Statut du compte
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Date de dernière modification admin
  lastAdminUpdate: {
    type: Date
  },
  
  // Admin qui a créé/modifié ce compte
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
  
  // Calculer l'âge
  if (this.birthYear) {
    this.age = new Date().getFullYear() - this.birthYear;
  }
  
  // Date d'inscription formatée
  if (!this.subscriptionDate) {
    this.subscriptionDate = new Date().toLocaleDateString('fr-FR');
  }
  
  // Hash du mot de passe
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// Méthode pour vérifier le mot de passe
memberSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode toJSON pour cacher le mot de passe
memberSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Member', memberSchema);
