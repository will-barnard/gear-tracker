require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const { runMigrations } = require('./db/migrate');
const attachments = require('./services/attachments');
const backup = require('./services/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Beachhead's proxy and the frontend nginx.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// Body parsers only touch JSON/urlencoded bodies, so multipart uploads reach
// the attachment routes' busboy stream untouched. Import files are the one
// large JSON body; it's mounted first with its own limit (the parser below
// skips a body that's already been parsed).
app.use('/api/data/import', express.json({ limit: '50mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/items', require('./routes/item.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/costs', require('./routes/cost.routes'));
app.use('/api/bundles', require('./routes/bundle.routes'));
app.use('/api/data', require('./routes/data.routes'));
// Mounted at /api because it serves /api/items/:id/attachments,
// /api/bundles/:id/attachments, /api/attachments/* and /api/files/*. The item
// and bundle routers above don't define those paths, so they fall through.
app.use('/api', require('./routes/attachment.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Error handling middleware. `error` is always a string the UI can show.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error(err.stack || err);
  let message = err.message || 'Internal Server Error';
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    message = err.errors?.map((e) => e.message).join('; ') || message;
    return res.status(400).json({ error: message });
  }
  if (status >= 500 && process.env.NODE_ENV === 'production' && !err.status) {
    message = 'Something went wrong on the server';
  }
  if (res.headersSent) return res.destroy();
  res.status(status).json({
    error: message,
    ...(err.retryable && { retryable: true }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // sync() only creates tables that don't exist (fresh install, or a new
    // model like attachments); it never alters existing ones. Column changes
    // are numbered SQL files in src/db/migrations, applied right after.
    await sequelize.sync({ alter: false });
    await runMigrations(sequelize);
    console.log('Database ready.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    attachments.startSweeper();
    backup.startScheduler();
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
