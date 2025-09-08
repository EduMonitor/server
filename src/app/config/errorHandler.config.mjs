import { logger } from "./logger.config.mjs";

// Updated error handler with CSRF error support
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(err.stack);
  logger.error(`Error: ${err.message} - ${req.method} ${req.url}`);

  // Handle CSRF-specific errors first
  if (err.code === 'EBADCSRFTOKEN' || 
      err.code === 'CSRF_TOKEN_MISMATCH' || 
      err.code === 'CSRF_TOKEN_INVALID' ||
      err.message?.toLowerCase().includes('csrf') ||
      err.message?.toLowerCase().includes('invalid csrf token')) {
    
    return res.status(403).json({
      success: false,
      error: {
        code: "CSRF_TOKEN_ERROR",
        message: "Security token validation failed. Please refresh the page and try again.",
        type: "SECURITY_ERROR"
      }
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
        type: "CLIENT_ERROR"
      }
    });
  }

  // Handle authentication errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
        type: "AUTH_ERROR"
      }
    });
  }

  // Handle not found errors
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        type: "CLIENT_ERROR"
      }
    });
  }

  // Handle forbidden errors
  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access denied",
        type: "AUTH_ERROR"
      }
    });
  }

  // Default error response for all other errors
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
      type: "SERVER_ERROR",
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: err.stack,
        details: err 
      })
    }
  });
};

export { errorHandler };