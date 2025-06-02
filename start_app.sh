#!/bin/bash

# Configuration des couleurs pour la console
BLUE='\033[1;34m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m' # No Color

echo "============================================="
echo -e "${BLUE}              TurboChat - Démarrage                    ${NC}"
echo "============================================="

# Vérifier si le port 8000 est déjà utilisé
PORT_CHECK=$(lsof -i:8000 -t)
if [ -n "$PORT_CHECK" ]; then
    echo -e "${YELLOW}Le port 8000 est déjà utilisé par le processus $PORT_CHECK${NC}"
    echo -e "Voulez-vous :"
    echo -e "1) Tuer le processus occupant le port 8000"
    echo -e "2) Utiliser un autre port"
    echo -e "3) Quitter"
    read -p "Votre choix (1/2/3): " CHOICE
    
    case $CHOICE in
        1)
            echo -e "${YELLOW}Arrêt du processus $PORT_CHECK...${NC}"
            kill -9 $PORT_CHECK
            sleep 1
            ;;
        2)
            read -p "Entrez un nouveau port pour le backend: " NEW_PORT
            ;;
        3)
            echo -e "${RED}Sortie du script de démarrage.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Choix invalide. Sortie du script.${NC}"
            exit 1
            ;;
    esac
else
    NEW_PORT=8000
fi

# Démarrer le backend
echo -e "${GREEN}Démarrage du backend (port: ${NEW_PORT:-8000})...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || (echo -e "${RED}Erreur: Environnement virtuel non trouvé. Création...${NC}" && python -m venv venv && source venv/bin/activate)
pip install -r requirements.txt >/dev/null 2>&1
echo -e "${GREEN}Dépendances installées.${NC}"

# Démarrer le backend en arrière-plan avec le port spécifié
if [ -n "$NEW_PORT" ] && [ "$NEW_PORT" != "8000" ]; then
    uvicorn app:app --host 0.0.0.0 --port $NEW_PORT &
else
    uvicorn app:app --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!
echo -e "${GREEN}Backend démarré (PID: $BACKEND_PID)${NC}"

# Attendre un peu que le backend démarre
sleep 2

cd ../frontend

# Vérifier si Node.js est installé
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Erreur: Node.js n'est pas installé.${NC}"
    echo -e "${YELLOW}Veuillez installer Node.js avant de continuer.${NC}"
    kill $BACKEND_PID
    exit 1
fi

# Installer les dépendances frontend si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
    npm install
fi

# Créer un fichier .env temporaire avec le proxy API si nécessaire
if [ -n "$NEW_PORT" ] && [ "$NEW_PORT" != "8000" ]; then
    echo "VITE_API_URL=http://localhost:$NEW_PORT" > .env
fi

# Démarrer le frontend
echo -e "${GREEN}Démarrage du frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}Frontend démarré (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}TurboChat est en cours d'exécution !${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}Ouvrez votre navigateur à l'adresse : http://localhost:3000${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "Appuyez sur Ctrl+C pour arrêter l'application"

# Trapping Ctrl+C
trap 'echo -e "${YELLOW}Arrêt de TurboChat...${NC}"; kill $BACKEND_PID; kill $FRONTEND_PID; echo -e "${GREEN}Application arrêtée.${NC}"; exit 0' INT

# Attendre que l'utilisateur arrête l'application
wait 