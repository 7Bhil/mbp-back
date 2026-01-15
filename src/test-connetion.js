const mongoose = require('mongoose');

// TEST DIRECT AVEC VOTRE URI
const MONGODB_URI = 'mongodb+srv://7bhil:lkeURbDG5dci7pk9@cluster0.hcpey4j.mongodb.net/mpb_db?retryWrites=true&w=majority';

console.log('🧪 TEST DIRECT MONGODB ATLAS');
console.log('================================');

async function test() {
  console.log('\n1️⃣  Tentative de connexion simple...');
  
  try {
    // CONFIGURATION MINIMALE
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ CONNEXION RÉUSSIE!');
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port}`);
    
    // Tester une opération simple
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.length}`);
    
    await mongoose.disconnect();
    console.log('\n🎉 Tout fonctionne!');
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    
    console.log('\n🔧 DIAGNOSTIC:');
    console.log('1. Allez sur https://cloud.mongodb.com');
    console.log('2. Cliquez sur "Network Access"');
    console.log('3. Cliquez "ADD IP ADDRESS"');
    console.log('4. Entrez "0.0.0.0/0" et confirmez');
    console.log('5. Attendez quelques minutes');
    console.log('6. Réessayez');
    
    console.log('\n📧 Votre URI complète:');
    console.log(MONGODB_URI);
  }
}

test();