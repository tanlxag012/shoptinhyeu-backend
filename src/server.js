require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;

const connectDB      = require('../config/db');
const errorHandler   = require('./middleware/errorHandler');
const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const miscRoutes     = require('./routes/index');

// ── CLOUDINARY CONFIG ───────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── APP SETUP ───────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet());

// CORS – cho phép React FE và Admin FE kết nối
app.use(cors({
  origin: [
    'http://localhost:3000',   // React app
    "https://shoptinhyeu-t.vercel.app",
    'http://localhost:5173',   // Vite dev
    'http://localhost:4173',   // Vite preview
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  ],
  credentials: true,
}));

// Rate limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
}));
app.use('/api', rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api',          miscRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} không tồn tại` }));

// Error handler
app.use(errorHandler);

// ── START ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 4EM Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`   API: http://localhost:${PORT}/api`);
  });
});

module.exports = app;
