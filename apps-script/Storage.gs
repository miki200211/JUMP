const FOLDER_NAME = 'JumpApp';
const MESSAGES_FILE = 'messages';
const UPLOADS_FOLDER_NAME = 'uploads';

// Message sheet columns. Old sheets only have the first five; reads stay
// tolerant because the extra columns come back as '' on legacy rows.
const MESSAGE_HEADERS = ['id', 'ts', 'nickname', 'text', 'clientHash', 'type', 'mediaUrl'];

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
  getOrCreateSpreadsheet(folder, MESSAGES_FILE, MESSAGE_HEADERS);

  // Create uploads subfolder if missing
  getOrCreateSubfolder(folder, UPLOADS_FOLDER_NAME);

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
 * Helper to get or create a subfolder inside a parent folder.
 */
function getOrCreateSubfolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

/**
 * Get the app root folder, initializing the workspace on first run.
 */
function getAppFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return initWorkspace();
}

/**
 * Get the folder holding uploaded chat images.
 */
function getUploadsFolder() {
  return getOrCreateSubfolder(getAppFolder(), UPLOADS_FOLDER_NAME);
}

/**
 * Get spreadsheet by name. Initializes workspace if folder not found.
 */
function getSpreadsheet(name) {
  const folder = getAppFolder();

  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  // If folder exists but file doesn't, initialize
  initWorkspace();
  return SpreadsheetApp.openById(folder.getFilesByName(name).next().getId());
}

/**
 * One-time migration: run manually from the Apps Script editor after
 * upgrading, to label the new 'type' / 'mediaUrl' columns on an existing
 * messages sheet. Reads work without it; this is purely cosmetic.
 */
function migrateSchemaHeaders() {
  const sheet = getSpreadsheet(MESSAGES_FILE).getSheets()[0];
  if (!sheet.getRange(1, 6).getValue()) {
    sheet.getRange(1, 6).setValue('type');
  }
  if (!sheet.getRange(1, 7).getValue()) {
    sheet.getRange(1, 7).setValue('mediaUrl');
  }
}
