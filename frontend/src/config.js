// URL de base de l'API backend.
// 1) Priorité à VITE_API_URL si défini (ex: dans un fichier .env : VITE_API_URL=https://mon-backend.com)
// 2) Sinon, on déduit l'hôte depuis l'URL courante du navigateur (utile si le site est ouvert
//    depuis une IP ou un nom de domaine différent de "localhost")
export const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
