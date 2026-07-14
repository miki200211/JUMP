/**
 * Global Configuration Settings
 * Load this script first in index.html to populate global config variables.
 */
const CONFIG = {
  // Replace this placeholder with your deployed Google Apps Script Web App URL
  API_BASE: 'https://script.google.com/macros/s/AKfycbyPHGYXbcAZ2iy6eTfWmkBSLV53Ki5Yt6GB81VW5tDbLYVz6Nd8sar5Ysa5HndeaVhT/exec',

  // Polling interval in milliseconds. Must be at least 5000ms to preserve execution quota.
  POLL_INTERVAL_MS: 5000,

  // Maximum error backoff duration (1 minute)
  RETRY_DELAY_MAX_MS: 60000,

  // Image upload limit in raw bytes (before base64). Mirrors the backend cap.
  UPLOAD_MAX_RAW_BYTES: 4194304,

  // Non-GIF images beyond this dimension are downscaled to JPEG before upload
  IMAGE_MAX_DIMENSION: 1600,
  IMAGE_JPEG_QUALITY: 0.85
};
