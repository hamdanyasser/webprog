const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../PL/views'));

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Relaxed rate limiting for university project/development
// Note: Tighten these limits for production deployment

// General API rate limiting (very relaxed for testing)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes (suitable for demos and testing)
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS || 'https://yourdomain.com').split(',')
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../PL/public')));

// Make rate limiter available to routes
app.locals.apiLimiter = apiLimiter;

const apiRoutes = require('./routes/index');
app.use('/api', apiLimiter, apiRoutes);

const forgotRoutes = require('./routes/forgot');
app.use('/', forgotRoutes);

const viewRoutes = require('./routes/views');
app.use('/', viewRoutes);

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

module.exports = app;
