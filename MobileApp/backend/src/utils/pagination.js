// Shared pagination utility
function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

// Safe JSON parse that returns fallback on corrupt data instead of throwing
function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = { parsePagination, safeJsonParse };
