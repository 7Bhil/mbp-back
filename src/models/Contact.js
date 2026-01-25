const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true
    },
    email: {
        type: String,
        required: [true, "L'email est requis"],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Veuillez ajouter un email valide'
        ]
    },
    phone: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        required: [true, 'Le sujet est requis']
    },
    message: {
        type: String,
        required: [true, 'Le message est requis'],
        maxlength: [2000, 'Le message ne peut pas dépasser 2000 caractères']
    },
    status: {
        type: String,
        enum: ['nouveau', 'lu', 'répondu'],
        default: 'nouveau'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contact', contactSchema);
