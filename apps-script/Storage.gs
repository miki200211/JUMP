const FOLDER_NAME = 'JumpApp';
const MESSAGES_FILE = 'messages';
const ANALYTICS_FILE = 'analytics';
const CONFIG_FILE = 'config.json';

const DEFAULT_CONFIG = {
  "links": [
    {
      "id": "youtube",
      "label": "YouTube 頻道",
      "url": "https://www.youtube.com/@example",
      "appScheme": "vnd.youtube://www.youtube.com/@example",
      "icon": "yt.svg",
      "enabled": true
    },
    {
      "id": "instagram",
      "label": "Instagram",
      "url": "https://www.instagram.com/example",
      "appScheme": "instagram://user?username=example",
      "icon": "ig.svg",
      "enabled": true
    },
    {
      "id": "facebook",
      "label": "Facebook 粉專",
      "url": "https://www.facebook.com/example",
      "appScheme": "fb://page/123456789",
      "icon": "fb.svg",
      "enabled": true
    }
  ]
};

/**
 * Initialize workspace files and folders if not exist.
 * Returns the folder object.
 */
function initWorkspace() {
  let folder;
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
  }
  
  // Create messages sheet if missing
  getOrCreateSpreadsheet(folder, MESSAGES_FILE, ['id', 'ts', 'nickname', 'text', 'clientHash']);
  
  // Create analytics sheet if missing
  getOrCreateSpreadsheet(folder, ANALYTICS_FILE, ['ts', 'linkId', 'referrer', 'userAgent']);
  
  // Create config.json if missing
  getOrCreateJsonFile(folder, CONFIG_FILE, DEFAULT_CONFIG);
  
  return folder;
}

/**
 * Helper to get or create a spreadsheet inside a specific folder.
 */
function getOrCreateSpreadsheet(folder, name, headers) {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  const ss = SpreadsheetApp.create(name);
  const file = DriveApp.getFileById(ss.getId());
  
  file.moveTo(folder);
  
  const sheet = ss.getSheets()[0];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  return ss;
}

/**
 * Helper to get or create a JSON file inside a specific folder.
 */
function getOrCreateJsonFile(folder, name, defaultData) {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    return files.next();
  }
  
  return folder.createFile(name, JSON.stringify(defaultData, null, 2), MimeType.PLAIN_TEXT);
}

/**
 * Get spreadsheet by name. Initializes workspace if folder not found.
 */
function getSpreadsheet(name) {
  let folders = DriveApp.getFoldersByName(FOLDER_NAME);
  let folder;
  if (!folders.hasNext()) {
    folder = initWorkspace();
  } else {
    folder = folders.next();
  }
  
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }
  
  // If folder exists but file doesn't, initialize
  initWorkspace();
  return SpreadsheetApp.openById(folder.getFilesByName(name).next().getId());
}

/**
 * Get JSON config contents.
 */
function getConfigJsonContent() {
  let folders = DriveApp.getFoldersByName(FOLDER_NAME);
  let folder;
  if (!folders.hasNext()) {
    folder = initWorkspace();
  } else {
    folder = folders.next();
  }
  
  const files = folder.getFilesByName(CONFIG_FILE);
  if (files.hasNext()) {
    const file = files.next();
    return file.getAs('text/plain').getDataAsString();
  }
  
  initWorkspace();
  const file = folder.getFilesByName(CONFIG_FILE).next();
  return file.getAs('text/plain').getDataAsString();
}
