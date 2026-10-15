# ==============================================================================
# Étape 1 : Construction du bundle Angular 22 en mode production
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des manifestes de dépendances pour tirer parti du cache Docker
COPY package.json package-lock.json ./

# Installation propre des dépendances exactes
RUN npm ci --prefer-offline --no-audit

# Copie de l'intégralité du code source du frontend
COPY . .

# Construction de l'application avec la configuration de production
RUN npm run build -- --configuration=production

# ==============================================================================
# Étape 2 : Serveur Nginx léger pour servir le build statique
# ==============================================================================
FROM nginx:1.27-alpine

# Remplacement de la configuration Nginx par défaut
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques compilés depuis l'étape de build
# Note : Angular 22 (@angular/build:application) génère les fichiers dans dist/ayyouFrontend/browser
COPY --from=builder /app/dist/ayyouFrontend/browser /usr/share/nginx/html

# Vérification de santé du conteneur
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/sante || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
