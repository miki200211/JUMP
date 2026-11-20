/**
 * Global Configuration Settings
 * Load this script first in index.html to populate global config variables.
 */
const CONFIG = {
  // Replace this placeholder with your deployed Google Apps Script Web App URL
  API_BASE: 'https://script.google.com/macros/s/AKfycbyJ-eYmdrDHrikho3NNkWYDPsfNj7wQboQDMON3iXF3quYxfbzK8SC8NwHHtZ1p4oaj/exec',

  // Polling interval in milliseconds. Must be at least 5000ms to preserve execution quota.
  POLL_INTERVAL_MS: 5000,

  // Maximum error backoff duration (1 minute)
  RETRY_DELAY_MAX_MS: 60000,

  // Image upload limit in raw bytes (before base64). Mirrors the backend cap.
  UPLOAD_MAX_RAW_BYTES: 4194304,

  // Non-GIF images beyond this dimension are downscaled to JPEG before upload
  IMAGE_MAX_DIMENSION: 1600,
  IMAGE_JPEG_QUALITY: 0.85,

  // OneSignal App ID for offline Web Push (set this to enable notifications when browser tab is closed)
  ONESIGNAL_APP_ID: 'YOUR_ONESIGNAL_APP_ID',

  // Firebase Realtime Database config for 3D RPG real-time multiplayer, party & PvP.
  // Fill in databaseURL (and apiKey/projectId) from Firebase Console -> Realtime Database to enable multiplayer.
  FIREBASE_CONFIG: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: ''
  }
};
