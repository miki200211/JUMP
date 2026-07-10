/**
 * Global Configuration Settings
 * Load this script first in index.html to populate global config variables.
 */
const CONFIG = {
  // Replace this placeholder with your deployed Google Apps Script Web App URL
  API_BASE: 'https://script.google.com/macros/s/AKfycbxJUyoiXda7ux-JaC_jB6eXKd55OtEQCFFEYlD_J1EPnS4VPzYl7xSm00oLZlNuyH20/exec',
  
  // Polling interval in milliseconds. Must be at least 5000ms to preserve execution quota.
  POLL_INTERVAL_MS: 5000,
  
  // Maximum error backoff duration (1 minute)
  RETRY_DELAY_MAX_MS: 60000
};
