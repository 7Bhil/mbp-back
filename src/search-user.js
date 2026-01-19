require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');
const PendingMember = require('./models/PendingMember');

const searchUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connexion à MongoDB réussie.\n');

        const searchName = 'Bhilal';

        // Recherche dans Member
        const members = await Member.find({
            $or: [
                { nom: { $regex: searchName, $options: 'i' } },
                { prenom: { $regex: searchName, $options: 'i' } },
                { email: { $regex: searchName, $options: 'i' } }
            ]
        });

        // Recherche dans PendingMember
        const pendingMembers = await PendingMember.find({
            $or: [
                { nom: { $regex: searchName, $options: 'i' } },
                { prenom: { $regex: searchName, $options: 'i' } },
                { email: { $regex: searchName, $options: 'i' } }
            ]
        });

        console.log(`Recherche de "${searchName}" :`);
        console.log(`- Dans les membres confirmés : ${members.length} trouvé(s)`);
        members.forEach(m => console.log(`  • ${m.prenom} ${m.nom} (${m.email})`));

        console.log(`- Dans les inscriptions en attente : ${pendingMembers.length} trouvé(s)`);
        pendingMembers.forEach(m => console.log(`  • ${m.prenom} ${m.nom} (${m.email})`));

        await mongoose.connection.close();
    } catch (error) {
        console.error('Erreur lors de la recherche :', error);
        process.exit(1);
    }
};

searchUser();
