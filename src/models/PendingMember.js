const mongoose = require('mongoose');

const pendingMemberSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  code_telephone: { type: String, default: '+229' },
  telephone: { type: String, required: true },
  pays: { type: String, required: true },
  departement: { type: String },
  commune: { type: String, required: true },
  profession: { type: String, required: true },
  disponibilite: { type: String, required: true },
  motivation: { type: String, required: true },
  engagement_valeurs_mpb: { type: Boolean, default: false },
  consentement_donnees: { type: Boolean, default: false },
  password: { type: String, required: true },
  verificationToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Expire après 24h
}, { timestamps: true });

module.exports = mongoose.model('PendingMember', pendingMemberSchema);
