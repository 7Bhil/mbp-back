// test-images.js (dans server/src/)
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testImages() {
  console.log('🧪 Test des images...\n');
  
  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  const postsDir = path.join(UPLOADS_DIR, 'images', 'posts');
  
  // 1. Vérifier les fichiers locaux
  if (!fs.existsSync(postsDir)) {
    console.log('❌ Dossier posts non trouvé');
    return;
  }
  
  const files = fs.readdirSync(postsDir).slice(0, 3);
  console.log(`📁 ${files.length} fichier(s) trouvé(s):`);
  
  for (const file of files) {
    const localPath = path.join(postsDir, file);
    const stat = fs.statSync(localPath);
    const url = `http://localhost:5000/uploads/images/posts/${file}`;
    
    console.log(`\n📄 ${file}`);
    console.log(`  Taille: ${(stat.size / 1024).toFixed(1)} KB`);
    console.log(`  URL: ${url}`);
    console.log(`  Chemin: ${localPath}`);
    
    // 2. Tester l'URL HTTP
    try {
      const response = await axios.head(url);
      console.log(`  ✅ HTTP: ${response.status}`);
      
      // 3. Vérifier Content-Type
      if (response.headers['content-type']) {
        console.log(`  📦 Type: ${response.headers['content-type']}`);
      }
      
      // 4. Vérifier CORS
      if (response.headers['access-control-allow-origin']) {
        console.log(`  🌐 CORS: ${response.headers['access-control-allow-origin']}`);
      }
      
    } catch (error) {
      console.log(`  ❌ HTTP: ${error.message}`);
      
      if (error.response) {
        console.log(`     Status: ${error.response.status}`);
        console.log(`     Headers:`, error.response.headers);
      }
    }
  }
  
  // 5. Tester la route API
  try {
    const apiResponse = await axios.get('http://localhost:5000/api/uploads/check');
    console.log('\n📊 Route /api/uploads/check:');
    console.log(`  Success: ${apiResponse.data.success}`);
    console.log(`  Files: ${apiResponse.data.filesCount}`);
  } catch (error) {
    console.log('\n❌ Erreur route API:', error.message);
  }
}

testImages();