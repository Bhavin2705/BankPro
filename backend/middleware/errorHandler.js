const errorHandler = (err, req, res, next) => {
    let msg = err.message || 'Server Error';
    let status = err.statusCode || 500;

    if (err.name === 'CastError') {
        msg = 'Resource not found';
        status = 404;
    } else if (err.message && err.message.startsWith('Not allowed by CORS')) {
        status = 403;
    } else if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        msg = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        status = 400;
    } else if (err.name === 'ValidationError') {
        msg = Object.values(err.errors || {}).map(v => v.message).join(', ');
        status = 400;
    } else if (err.name === 'JsonWebTokenError') {
        msg = 'Invalid token';
        status = 401;
    } else if (err.name === 'TokenExpiredError') {
        msg = 'Token expired';
        status = 401;
    } else if (err.name === 'MulterError') {
        msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Max size is 2MB.' : err.message;
        status = 400;
    }

    const timestamp = new Date().toISOString();

    // Log full stack trace for 500 server errors, concise 1-liner for 4xx client errors
    if (status >= 500) {
        console.error(`[${timestamp}] 500 Internal Error (${req.method} ${req.originalUrl || req.url}):`, err);
    } else {
        console.warn(`[${timestamp}] ${status} ${req.method} ${req.originalUrl || req.url} - ${msg}`);
    }

    res.status(status).json({
        success: false,
        error: msg,
        ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack })
    });
};

module.exports = errorHandler;