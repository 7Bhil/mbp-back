const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleAuth');
const { uploadFiles } = require('../middleware/upload');
const path = require('path');

// Upload de fichiers (admin seulement)
router.post('/upload', authenticate, isAdmin, uploadFiles, async (req, res) => {
  try {
    const files = req.files;
    const uploads = {
      images: [],
      files: []
    };

    // Traiter les images
    if (files.images) {
      uploads.images = files.images.map(img => ({
        url: `/uploads/images/${path.basename(img.path)}`,
        filename: path.basename(img.path),
        originalName: img.originalname,
        size: img.size,
        uploadedAt: new Date()
      }));
    }

    // Traiter les fichiers
    if (files.files) {
      uploads.files = files.files.map(file => {
        const ext = path.extname(file.originalname).toLowerCase();
        let fileType = 'other';
        
        if (ext === '.pdf') fileType = 'pdf';
        else if (ext === '.doc' || ext === '.docx') fileType = 'doc';
        else if (ext === '.xls' || ext === '.xlsx') fileType = 'xls';
        else if (ext === '.ppt' || ext === '.pptx') fileType = 'ppt';
        else if (ext === '.txt') fileType = 'txt';

        return {
          url: `/uploads/documents/${path.basename(file.path)}`,
          filename: path.basename(file.path),
          originalName: file.originalname,
          size: file.size,
          fileType: fileType,
          uploadedAt: new Date()
        };
      });
    }

    res.json({
      success: true,
      message: 'Fichiers uploadés avec succès',
      uploads: uploads
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Servir les fichiers statiques
router.use('/files', express.static('uploads'));

module.exports = router;