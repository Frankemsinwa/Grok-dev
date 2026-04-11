import rateLimit from 'express-rate-limit';

export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP/user to 30 requests per window
  message: {
    error: 'Too many requests from this IP, please try again after a minute',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
