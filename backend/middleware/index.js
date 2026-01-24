// Rate limiting middleware
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimit[ip]) {
    rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return next();
  }

  if (now > rateLimit[ip].resetTime) {
    rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return next();
  }

  if (rateLimit[ip].count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
    });
  }

  rateLimit[ip].count++;
  next();
}

// API key validation middleware (optional)
function validateApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!process.env.API_KEY) {
    return next(); // Skip if no API key configured
  }

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: "Invalid or missing API key",
    });
  }

  next();
}

// Request logger middleware
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

module.exports = {
  rateLimiter,
  validateApiKey,
  requestLogger,
};
