#!/bin/bash

echo "🚀 Démarrage du serveur MPB..."

# Vérifier si node est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "📦 Installation de Node.js..."
    sudo apt update
    sudo apt install -y nodejs npm
fi

# Vérifier si MongoDB est installé
if ! command -v mongod &> /dev/null; then
    echo "⚠️ MongoDB n'est pas installé"
    echo "📦 Installation de MongoDB..."
    
    # Pour Ubuntu/Debian
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
    echo "🔧 Démarrage de MongoDB..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Vérifier le fichier .env
if [ ! -f .env ]; then
    echo "📄 Création du fichier .env..."
    cat > .env << 'ENVEOF'
PORT=5001
MONGODB_URI=mongodb://localhost:27017/mpb_db
NODE_ENV=development
JWT_SECRET=mpb_secret_key_changez_cela_en_production_123456
JWT_EXPIRE=30d
ENVEOF
    echo "✅ Fichier .env créé"
fi

# Installer les dépendances si besoin
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install express mongoose cors dotenv bcryptjs jsonwebtoken express-rate-limit helmet
fi

# Démarrer le serveur
echo "⚡ Démarrage en cours..."
npm run dev
