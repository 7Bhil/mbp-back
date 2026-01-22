const Member = require('../models/Member');
const fs = require('fs');
const path = require('path');

exports.generateMembersCSV = async (req, res) => {
    try {
        const members = await Member.find().sort({ dateInscription: -1 });

        // En-têtes CSV
        const headers = [
            'ID Membre', 'Numéro Adhésion', 'Prénom', 'Nom', 'Email',
            'Téléphone', 'Age', 'Sexe', 'Pays', 'Ville', 'Département',
            'Profession', 'Rôle', 'Statut', 'Date Inscription'
        ].join(',');

        // Lignes de données
        const rows = members.map(m => {
            // Nettoyage des données pour éviter de casser le CSV
            const clean = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : '';

            return [
                clean(m.memberId),
                clean(m.membershipNumber),
                clean(m.prenom),
                clean(m.nom),
                clean(m.email),
                clean(m.telephone),
                clean(m.age),
                clean(m.sexe || 'Non spécifié'),
                clean(m.pays),
                clean(m.ville),
                clean(m.departement),
                clean(m.profession),
                clean(m.role),
                clean(m.isActive ? 'Actif' : 'Inactif'),
                clean(m.dateInscription ? new Date(m.dateInscription).toLocaleDateString() : '')
            ].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');

        // Envoi du fichier
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=rapport_membres_mpb.csv');
        res.status(200).send(csvContent);

    } catch (error) {
        console.error('Erreur génération rapport:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération du rapport' });
    }
};
