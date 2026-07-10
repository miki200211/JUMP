/**
 * Fetch links config.
 * Caches content in CacheService for up to 6 hours to minimize Drive API hits.
 */
function getLinks() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('links_config');
  if (cached) {
    return JSON.parse(cached);
  }
  
  const content = getConfigJsonContent();
  const config = JSON.parse(content);
  const links = config.links || [];
  
  try {
    // Cache for 6 hours (21600 seconds)
    cache.put('links_config', JSON.stringify(links), 21600);
  } catch (err) {
    // Fail silently if cache fails
  }
  
  return links;
}
