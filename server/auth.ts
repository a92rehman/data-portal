import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Validate email domain for requesters
function isValidRequesterEmail(email: string): boolean {
  const allowedDomains = ['@taleemabad.com', '@niete.edu.pk', '@niete.pk'];
  return allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy using email instead of username
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email field instead of username
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint - only for requesters with valid company emails
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate email domain for requesters
      if (!isValidRequesterEmail(email)) {
        return res.status(403).json({ 
          message: "Only company emails (@taleemabad.com, @niete.edu.pk, @niete.pk) can register as requesters" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user with hashed password - no role yet (will be set during requester signup flow)
      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        firstName: firstName || null,
        lastName: lastName || null,
        role: null, // Role will be set during the requester signup flow
        department: null,
        profileImageUrl: null,
      });

      // Log auth event
      try {
        await storage.logAuthEvent(user.id, 'signup', req.ip, req.get('user-agent'));
      } catch (logError) {
        console.error('[auth] Failed to log signup event:', logError);
      }

      // Auto login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error('[auth] Registration error:', error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);

        // Log auth event
        try {
          await storage.logAuthEvent(user.id, 'signin', req.ip, req.get('user-agent'));
        } catch (logError) {
          console.error('[auth] Failed to log signin event:', logError);
        }

        res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res, next) => {
    const userId = req.user?.id;
    
    req.logout(async (err) => {
      if (err) return next(err);

      // Log auth event
      if (userId) {
        try {
          await storage.logAuthEvent(userId, 'signout', req.ip, req.get('user-agent'));
        } catch (logError) {
          console.error('[auth] Failed to log signout event:', logError);
        }
      }

      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
