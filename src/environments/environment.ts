/**
 * Configuration de l'environnement de développement pour AYYOU Frontend.
 * Pointe vers le backend Django REST Framework et le microservice IA.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  mediaUrl: 'http://localhost:8000',
  iaUrl: 'http://localhost:8001',
};
