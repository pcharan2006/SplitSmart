// Uploaded files (avatars) are served by the backend at "/uploads/…".
// In development Vite forwards that path; in production the API lives on another origin.
const apiOrigin = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL, window.location.origin).origin : '';

export const assetUrl = (path) => (path ? `${apiOrigin}${path}` : null);
