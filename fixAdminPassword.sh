#!/bin/bash

echo "🔧 Correction du mot de passe admin..."

# Générer le hash correct
echo "🔐 Génération du hash pour 'admin123'..."
HASH=$(node -e "
const bcrypt = require('bcryptjs');
async function getHash() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  console.log(hash);
}
getHash();
" 2>/dev/null)

if [ -z "$HASH" ]; then
  echo "❌ Échec de génération du hash"
  exit 1
fi

echo "✅ Hash généré: ${HASH:0:30}..."

# Mettre à jour dans MongoDB
echo "🗄️  Mise à jour dans MongoDB..."
mongosh mpb_db --quiet << MONGOEOF
// Mettre à jour le mot de passe
db.members.updateOne(
  { email: "admin@gmail.com" },
  { \$set: { password: "$HASH" } }
);

// Vérifier
const admin = db.members.findOne({ email: "admin@gmail.com" });
if (admin) {
  print("✅ Admin mis à jour");
  print("📧 Email: " + admin.email);
  print("🔐 Hash présent: " + (admin.password ? "OUI" : "NON"));
} else {
  print("❌ Admin non trouvé");
}
MONGOEOF

echo ""
echo "🎉 Mot de passe admin corrigé !"
echo "👑 Testez la connexion :"
echo "curl -X POST http://localhost:5000/api/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"identifier\":\"admin@gmail.com\",\"password\":\"admin123\",\"loginType\":\"email\"}'"
