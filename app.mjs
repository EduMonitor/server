import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import { doubleCsrf } from "csrf-csrf";
import helmet from "helmet";
import MongoStore from "connect-mongo";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import hpp from "hpp";
import nocache from "nocache";
import { v4 as uuidv4 } from "uuid";

// Custom imports
import { passport } from "./src/app/middlewares/passport.middlewares.mjs";
import { logErrors, logRequest } from "./src/app/config/logger.config.mjs";
import { errorHandler } from "./src/app/config/errorHandler.config.mjs";
import { redirectBrowserRequests } from "./src/app/middlewares/redirection.middlewares.mjs";
import { authRoute } from "./src/routes/auth/localAuth.routes.mjs";
import { gAuthRoutes } from "./src/routes/auth/googleAuth.routes.mjs";

// Init
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables validation
const requiredEnvVars = ['SESSION_SECRET', 'CSRF_SECRET', 'DB_CONNECTION_STRING', 'FRONTEND_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is not defined.`);
    process.exit(1);
  }
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FRONTEND_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

// ---------- TRUST PROXY (Important for production) ----------
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// ---------- BASIC MIDDLEWARE STACK ----------
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(hpp());
app.use(nocache());

// Cookie parser MUST be set up before sessions and CSRF
app.use(cookieParser(process.env.COOKIE_PASSER_SECRET));

// ---------- CORS CONFIGURATION (Early to handle preflight) ----------
app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, postman, etc.) in development
      if (!IS_PRODUCTION && !origin) return callback(null, true);
      
      if (FRONTEND_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "x-csrf-token", 
      "X-CSRF-Token",
      "Cookie",
      "Cache-Control"
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// ---------- STATIC FILES ----------
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || process.env.FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// ---------- CSP NONCE ----------
app.use((req, res, next) => {
  res.locals.cspNonce = uuidv4();
  next();
});

// ---------- SECURITY HEADERS (Helmet) ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          "'strict-dynamic'"
        ],
        connectSrc: ["'self'", `${process.env.SERVER_URL}`, `ws://${process.env.SERVER_URL}`],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "https://trustedimagehost.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// Additional security headers
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hidePoweredBy());
app.use(helmet.ieNoOpen());
app.use(helmet.originAgentCluster());
app.use(helmet.hsts({ 
  maxAge: IS_PRODUCTION ? 31536000 : 0, // 1 year in production, disabled in dev
  includeSubDomains: IS_PRODUCTION 
}));
app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet.dnsPrefetchControl({ allow: false }));

// ---------- SESSIONS CONFIGURATION ----------
const sessionConfig = {
  name: 'sessionId', // Custom session name
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true, // ✅ Create session for all users (needed for CSRF)
  rolling: true, // ✅ Refresh session on activity
  store: MongoStore.create({
    mongoUrl: process.env.DB_CONNECTION_STRING,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days
    touchAfter: 24 * 3600, // Lazy session update
  }),
  cookie: {
    name: 'sessionId',
    secure: IS_PRODUCTION, // HTTPS only in production
    httpOnly: true, // Prevent XSS
    sameSite: IS_PRODUCTION ? "strict" : "lax", // ✅ Lax for dev, strict for production
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    domain: IS_PRODUCTION ? process.env.COOKIE_DOMAIN : undefined,
  },
  genid: () => uuidv4(), // Use UUID for session IDs
};

app.use(session(sessionConfig));

// ---------- CSRF CONFIGURATION ----------
const { 
  generateCsrfToken,
  validateRequest
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  
  getSessionIdentifier: (req) => {
    // Use session ID as primary identifier
    const sessionId = req.sessionID;
    if (!sessionId) {
      console.warn('⚠️  No session ID found for CSRF');
      return `fallback-${req.ip}-${Date.now()}`;
    }
    return sessionId;
  },
  
  cookieName: "XSRF-TOKEN",
  cookieOptions: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: false, // ✅ Allow client to read for debugging
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    path: "/",
  },
  
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => {
    return req.headers["x-csrf-token"] || 
           req.headers["X-CSRF-Token"] || 
           req.body?._csrf ||
           req.query._csrf;
  },
  size: 64,
});

// ---------- CSRF TOKEN GENERATION ----------
app.use((req, res, next) => {
  try {
    req.csrfToken = generateCsrfToken(req, res);
    next();
  } catch (error) {
    console.error('❌ Error generating CSRF token:', error);
    next(error);
  }
});

// ---------- DEBUG MIDDLEWARE (Remove in production) ----------
if (!IS_PRODUCTION) {
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
      console.log('\n=== REQUEST DEBUG ===');
      console.log(`${req.method} ${req.path}`);
      console.log('Origin:', req.headers.origin);
      console.log('Session ID:', req.sessionID);
      console.log('CSRF Token (Header):', req.headers['x-csrf-token']);
      console.log('CSRF Token (Generated):', req.csrfToken);
      console.log('Cookies:', Object.keys(req.cookies));
      console.log('==================\n');
    }
    next();
  });
}

// ---------- LOGGING ----------
app.use(logRequest);

// ---------- CSRF TOKEN ENDPOINT ----------
app.get("/csrf-token", (req, res) => {
  try {
    res.json({ 
      success: true,
      csrfToken: req.csrfToken,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in CSRF token endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: "TOKEN_GENERATION_ERROR",
        message: "Failed to generate CSRF token",
        type: "SERVER_ERROR"
      }
    });
  }
});

// ---------- CSRF PROTECTION MIDDLEWARE ----------
app.use((req, res, next) => {
  // Skip CSRF for certain paths and methods
  const exemptPaths = ["/csrf-token", "/api/v2/nonce", "/health"];
  const exemptMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (exemptPaths.includes(req.path) || 
      req.path.startsWith("/socket.io/") ||
      req.path.startsWith("/public/") ||
      req.path.startsWith("/uploads/") ||
      exemptMethods.includes(req.method)) {
    return next();
  }

  // Validate CSRF token
  try {
    const isValid = validateRequest(req);
    
    if (!isValid) {
      console.log(`❌ CSRF validation failed: ${req.method} ${req.path}`);
      console.log(`   Session: ${req.sessionID}`);
      console.log(`   Token: ${req.headers['x-csrf-token']}`);
      
      return res.status(403).json({
        success: false,
        error: {
          code: "CSRF_TOKEN_INVALID",
          message: "CSRF token validation failed. Please refresh and try again.",
          type: "SECURITY_ERROR",
          timestamp: new Date().toISOString(),
          ...((!IS_PRODUCTION) && {
            debug: {
              sessionId: req.sessionID,
              hasToken: !!req.headers['x-csrf-token'],
              method: req.method,
              path: req.path
            }
          })
        }
      });
    }
    
    console.log(`✅ CSRF validation passed: ${req.method} ${req.path}`);
    next();
    
  } catch (error) {
    console.error('❌ CSRF validation error:', error);
    
    return res.status(403).json({
      success: false,
      error: {
        code: "CSRF_VALIDATION_ERROR", 
        message: "CSRF token validation error. Please refresh and try again.",
        type: "SECURITY_ERROR",
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ---------- PASSPORT SETUP ----------
app.use(redirectBrowserRequests);
app.use(passport.initialize());
app.use(passport.session());

// ---------- API ROUTES ----------
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// CSP Nonce endpoint
app.get("/api/v2/nonce", (req, res) => {
  res.json({ 
    success: true,
    nonce: res.locals.cspNonce,
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use("/api/v2", authRoute);
app.use("/api/v2", gAuthRoutes);

// ---------- ERROR HANDLERS ----------
app.use(logErrors);
app.use(errorHandler);

// ---------- 404 HANDLER ----------
app.use('/*catch', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
      type: "CLIENT_ERROR"
    }
  });
});

export default app;