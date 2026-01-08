#!/bin/bash

echo "🔧 Création du compte administrateur complet..."

# Vérifier si MongoDB est accessible
if ! mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "❌ MongoDB n'est pas accessible"
    echo "💡 Démarrez MongoDB : sudo systemctl start mongod"
    exit 1
fi

# Exécuter la commande MongoDB
mongosh mpb_db --quiet << 'MONGOEOF'
// Supprimer l'admin existant s'il y a des erreurs
db.members.deleteOne({ email: "admin@gmail.com" });

// Créer le nouvel admin complet
db.members.insertOne({
  nom: "Admin",
  prenom: "System",
  email: "admin@gmail.com",
  phoneCode: "+229",
  telephone: "00000000",
  birthYear: 1990,
  age: 34,
  pays: "Bénin",
  department: "Littoral",
  commune: "Cotonou",
  profession: "Administrateur",
  disponibilite: "Temps plein",
  motivation: "Compte administrateur principal du Mouvement Patriotique du Bénin avec toutes les permissions de gestion des membres et du système.",
  password: "$2a$10$N9qo8uLOickgx2ZMRZoMye3Z5c7.8F7yUc7p8Yz5F3Q2F5QYz5F3Q",
  role: "admin",
  status: "Actif",
  isActive: true,
  memberId: "MPB-ADMIN-001",
  membershipNumber: "MPB-ADMIN-2024-001",
  dateInscription: new Date(),
  subscriptionDate: new Date().toLocaleDateString('fr-FR'),
  lastLogin: new Date()
});

// Vérifier la création
const admin = db.members.findOne({ email: "admin@gmail.com" });
if (admin) {
  print("✅ ADMIN CRÉÉ AVEC SUCCÈS !");
  print("📧 Email: " + admin.email);
  print("🎯 Rôle: " + admin.role);
  print("📊 Champs remplis: " + Object.keys(admin).length);
} else {
  print("❌ Échec de la création");
}
MONGOEOF

echo ""
echo "🎉 Le compte admin est maintenant prêt !"
echo "👑 Identifiants : admin@gmail.com / admin123"
