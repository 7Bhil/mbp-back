const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

const Member = require('../src/models/Member');

const mapProfession = (val) => {
    const v = val.toLowerCase();
    if (v.includes('étudiant')) return 'Étudiant';
    if (v.includes('entrepreneur')) return 'Entrepreneur';
    if (v.includes('infirmier') || v.includes('rh') || v.includes('ingénieur') || v.includes('employé')) return 'Employé';
    if (v.includes('enseignant') || v.includes('fonctionnaire')) return 'Fonctionnaire';
    if (v.includes('commerçant')) return 'Commerçant';
    if (v.includes('agriculteur')) return 'Agriculteur';
    if (v.includes('artisan')) return 'Artisan';
    if (v.includes('libérale')) return 'Profession libérale';
    if (v.includes('retraité')) return 'Retraité';
    if (v.includes('sans emploi')) return 'Sans emploi';
    return 'Autre';
};

const mapDisponibilite = (val) => {
    const v = val.toLowerCase();
    if (v.includes('très') || v.includes('disponble')) return '3-4 jours par semaine';
    if (v.includes('occasionnelle')) return 'Quelques heures par semaine';
    if (v.includes('plein')) return 'Temps plein';
    if (v.includes('weekend')) return 'Weekends uniquement';
    return '1-2 jours par semaine';
};

const importMembers = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        await mongoose.connect(MONGODB_URI);

        console.log('🗑️  Nettoyage final pour importation maximale...');
        await Member.deleteMany({ role: 'member' });

        const csvPath = path.join(__dirname, '..', '..', 'site-mpb', 'Formulaire sans titre.csv');
        const results = [];

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let imported = 0;
                let duplicates = 0;
                let fatal = 0;

                for (const row of results) {
                    try {
                        let email = (row["4 - E-mail"] || "").trim().toLowerCase();

                        // Si email vide ou invalide, tenter de récupérer le "Nom d'utilisateur"
                        if (!email.includes('@')) {
                            const altEmail = (row["Nom d'utilisateur"] || "").trim().toLowerCase();
                            if (altEmail.includes('@')) {
                                email = altEmail;
                            }
                        }

                        // Si toujours pas d'email valide, on ne peut rien faire (requis par le modele)
                        if (!email.includes('@')) {
                            console.log(`⚠️ Email fatalement invalide pour: ${row["1- Nom et prénom (s)"]}`);
                            fatal++;
                            continue;
                        }

                        // Vérifier les doublons
                        const existing = await Member.findOne({ email });
                        if (existing) {
                            duplicates++;
                            continue;
                        }

                        // Parsing Nom/Prénom
                        const fullName = (row["1- Nom et prénom (s)"] || "").trim();
                        const nameParts = fullName.split(' ');
                        const nom = nameParts[0] || 'Inconnu';
                        const prenom = nameParts.slice(1).join(' ') || nom;

                        // Age (flexible)
                        const ageStr = row["2 - Âge ( minimum 18 ans )"] || "18";
                        let age = parseInt(ageStr.match(/\d+/)) || 18;
                        if (age < 16) age = 16;
                        if (age > 100) age = 100;

                        // Location (Bénin par défaut si vide)
                        const loc = row["5 - Ville / Commune / Pays de résidence "] || "Bénin";
                        const locParts = loc.split(/[\/,]/).map(p => p.trim());
                        let pays = 'Bénin';
                        let commune = 'Inconnue';

                        if (locParts.length >= 3) {
                            commune = locParts[1];
                            pays = locParts[2];
                        } else if (locParts.length === 2) {
                            commune = locParts[0];
                            pays = locParts[1];
                        } else {
                            pays = locParts[0] || 'Bénin';
                        }

                        // Nettoyage Pays
                        if (pays.toLowerCase().includes('france')) pays = 'France';
                        else if (pays.toLowerCase().includes('canada')) pays = 'Canada';
                        else if (pays.toLowerCase().includes('benin') || pays.toLowerCase().includes('bénin')) pays = 'Bénin';
                        else if (pays.toLowerCase().includes('congo')) pays = 'Congo';
                        else if (pays.toLowerCase().includes('allemagne')) pays = 'Allemagne';
                        else if (pays.toLowerCase().includes('italie')) pays = 'Italie';

                        // Force pays si tjs vide
                        if (!pays) pays = 'Bénin';

                        // Motivation (min 20 chars pour validation)
                        let motivation = row["6 - Quelle est la ville que vous connaissez le mieux..."] || "Importation depuis CSV Google Forms";
                        if (motivation.length < 20) motivation = motivation.padEnd(20, '.');

                        const member = new Member({
                            nom,
                            prenom,
                            email,
                            age,
                            telephone: row["3 - Téléphone ( WhatsApp de préférence ) "] || "00000000",
                            pays,
                            commune: commune || 'Inconnue',
                            departement: pays === 'Bénin' ? 'Littoral' : undefined,
                            profession: mapProfession(row["7 - Profession ou activité principale "] || "Autre"),
                            disponibilite: mapDisponibilite(row["9 - Disponibilité pour les activités :"] || "1-2 jours par semaine"),
                            motivation,
                            centres_interet_competences: row["10 - Centres d'intérêt ou compétences"] || "",
                            section: row["8 - Souhaitez-vous rejoindre une section :"] || "Aucune",
                            engagement_valeurs_mpb: true,
                            consentement_donnees: true,
                            password: email,
                            isVerified: true,
                            status: 'Actif',
                            role: 'member',
                            profileCompleted: true
                        });

                        await member.save();
                        imported++;
                    } catch (err) {
                        console.error(`❌ Erreur sur ${row["1- Nom et prénom (s)"]}:`, err.message);
                        fatal++;
                    }
                }

                console.log(`\n🎉 IMPORTATION FINALE TERMINÉE`);
                console.log(`✅ Membres uniques créés : ${imported}`);
                console.log(`👯 Doublons ignorés : ${duplicates}`);
                console.log(`⚠️ Lignes rejetées (pas d'email) : ${fatal}`);

                const finalCount = await Member.countDocuments();
                console.log(`📊 Total en base de données : ${finalCount}`);
                process.exit(0);
            });
    } catch (error) {
        console.error('Erreur:', error.message);
        process.exit(1);
    }
};

importMembers();
