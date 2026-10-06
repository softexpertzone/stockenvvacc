const errorHandler = (err, req, res, next) => {
    // Explicitly attach CORS headers so the browser allows the frontend to read the error response
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Log the error
    console.error("❌ Global Error Handler:", {
        message: err.message,
        path: req.path,
        stack: err.stack
    });

    // Send the response
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

// Converted to ESM default export
export default errorHandler;