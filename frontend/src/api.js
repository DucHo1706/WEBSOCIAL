const API_BASE = "";

// Anti-spam: simple in-memory rate limiter
const requestCounts = new Map();
const THROTTLE_WINDOW = 1000; // 1 second
const MAX_REQUESTS = 5; // max 5 requests per window per endpoint

const isRateLimited = (path) => {
  const now = Date.now();
  const key = path.split('?')[0]; // ignore query params
  const entry = requestCounts.get(key) || { count: 0, resetAt: now + THROTTLE_WINDOW };
  
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + THROTTLE_WINDOW;
  }
  
  entry.count++;
  requestCounts.set(key, entry);
  
  return entry.count > MAX_REQUESTS;
};

export const getApiUrl = (path) => `${API_BASE}${path}`;

export const apiRequest = async (path, method = "GET", body = null, isMultipart = false) => {
  // Skip rate limiting for GET requests
  if (method !== "GET" && isRateLimited(path)) {
    console.warn(`Rate limited: ${path} - too many requests`);
    throw new Error("Yêu cầu quá nhanh! Vui lòng chậm lại.");
  }
  const url = getApiUrl(path);
  const options = {
    method,
    headers: {},
  };

  if (body) {
    if (isMultipart) {
      options.body = body; // Browser sets Content-Type automatically for FormData
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${path}:`, error);
    throw error;
  }
};
