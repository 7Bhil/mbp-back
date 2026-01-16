// src/models/Post.js - VERSION COMPLÈTE AVEC ÉVÉNEMENTS
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  base64: String, // Stockage base64
  thumbnailBase64: String, // Version miniature base64
  isMain: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['actualité', 'événement'],
    default: 'actualité'
  },
  category: {
    type: String,
    enum: ['politique', 'social', 'économique', 'culturel', 'éducation', 'santé', 'environnement', 'autre'],
    default: 'politique'
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  
  // Champs spécifiques aux événements
  eventDate: { type: Date },
  eventTime: { type: String },
  eventLocation: { type: String },
  eventAddress: { type: String },
  eventCity: { type: String },
  eventContact: { type: String },
  
  // Images stockées en base64
  images: [imageSchema],
  
  // Interactions
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  viewCount: { type: Number, default: 0 },
  
  // Métadonnées
  status: { 
    type: String, 
    enum: ['publié', 'brouillon', 'archivé'], 
    default: 'brouillon' 
  },
  featured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  publishDate: { type: Date },
  
  // Tags
  tags: [String]
}, { 
  timestamps: true 
});

// Index pour la recherche
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Middleware avant sauvegarde
postSchema.pre('save', function(next) {
  if (this.status === 'publié' && !this.publishDate) {
    this.publishDate = new Date();
    this.isPublished = true;
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);