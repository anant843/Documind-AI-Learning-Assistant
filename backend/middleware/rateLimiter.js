// In-memory sliding window rate limiter middleware with zero external dependencies

const createRateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const max = options.max || 100;
    const message = options.message || 'Too many requests, please try again later.';
    const ipHits = new Map();

    // Clean up expired keys every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [ip, data] of ipHits.entries()) {
            if (now - data.startTime > windowMs) {
                ipHits.delete(ip);
            }
        }
    }, 5 * 60 * 1000);

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client';
        const now = Date.now();

        let clientData = ipHits.get(ip);
        if (!clientData || now - clientData.startTime > windowMs) {
            clientData = { startTime: now, count: 1 };
            ipHits.set(ip, clientData);
            return next();
        }

        clientData.count += 1;
        if (clientData.count > max) {
            const retryAfterSec = Math.ceil((windowMs - (now - clientData.startTime)) / 1000);
            res.setHeader('Retry-After', retryAfterSec);
            return res.status(429).json({
                success: false,
                error: message,
                statusCode: 429,
                retryAfterSec
            });
        }

        next();
    };
};

export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

export const aiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: 'AI request limit reached. Please wait a few moments before trying again.'
});

export const generalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'API rate limit exceeded. Please slow down.'
});
