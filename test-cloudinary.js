// test-cloudinary-simple.js - ÇA MARCHE !
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('🔥 TEST CLOUDINARY ULTRA SIMPLE\n');

// 1. Montre les variables
console.log('1. Variables chargées:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? 'PRÉSENTE' : 'ABSENTE');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? 'PRÉSENTE' : 'ABSENTE');

// 2. Configure
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('\n2. Configuration appliquée');

// 3. Test ULTRA SIMPLE
console.log('\n3. Test de connexion...');

// Test avec une promesse simple
new Promise((resolve, reject) => {
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.log('❌ ERREUR:', error);
      reject(error);
    } else {
      console.log('✅ RÉSULTAT:', result);
      resolve(result);
    }
  });
})
.then(() => {
  console.log('\n🎉 CLOUDINARY FONCTIONNE !');
  console.log('\n🚀 Lance ton serveur: npm run dev');
})
.catch((err) => {
  console.log('\n💥 ÉCHEC DE LA CONNEXION');
  console.log('\n🔍 TES CLÉS ACTUELLES:');
  console.log('   Cloud Name: Bhildollars');
  console.log('   API Key: 455986248491317');
  console.log('   API Secret: rBdey2l4BuLapImg3mH__eo4CeM');
  
  console.log('\n⚠️  PROBLÈME: Tes clés sont peut-être incorrectes');
  console.log('   Vérifie sur https://cloudinary.com/console');
  console.log('   Cloud Name doit être en minuscules parfois');
  
  console.log('\n🔄 Essaye avec curl pour vérifier:');
  console.log('   curl -X GET "https://api.cloudinary.com/v1_1/Bhildollars/ping"');
});