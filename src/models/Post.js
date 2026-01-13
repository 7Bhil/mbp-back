// src/models/Post.js - VERSION SIMPLE
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['événement', 'actualité', 'communiqué', 'annonce', 'manifeste'],
    default: 'actualité'
  },
  category: {
    type: String,
    enum: ['politique', 'social', 'économique', 'culturel', 'éducation', 'santé', 'environnement', 'autre'],
    default: 'politique'
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  
  // Images
  images: [{
    url: String,
    filename: String,
    originalName: String,
    size: Number,
    isMain: { type: Boolean, default: false }
  }],
  
  // Interactions
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  viewCount: { type: Number, default: 0 },
  
  // Métadonnées
  status: { 
    type: String, 
    enum: ['publié', 'brouillon', 'archivé'], 
    default: 'publié' 
  },
  featured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  publishDate: { type: Date, default: Date.now },
  
  // Tags
  tags: [String]
}, { 
  timestamps: true 
});

// Index pour la recherche
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Post', postSchema);