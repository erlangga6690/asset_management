import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './models';
import { auth } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import equipmentRoutes from './routes/equipment';
import consumableRoutes from './routes/consumables';
import requestRoutes from './routes/requests';
import borrowRecordRoutes from './routes/borrowRecords';
import dashboardRoutes from './routes/dashboard';
import plannedItemRoutes from './routes/plannedItems';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: process.env.FE_URL,
    credentials: true
}
// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Public routes ────────────────────────────────────────────────────────────

// Auth
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Asset Management API v2', timestamp: new Date().toISOString() });
});

// ── Protected routes ─────────────────────────────────────────────────────────

// Apply auth middleware to all API routes except auth and health
const apiRouter = express.Router();
apiRouter.use(auth);

// Users
apiRouter.use('/users', userRoutes);

// Equipment (Investment)
apiRouter.use('/equipment', equipmentRoutes);

// Consumables (Expense)
apiRouter.use('/consumables', consumableRoutes);

// Consumable Requests (cart + approval)
apiRouter.use('/requests', requestRoutes);

// Borrow Records
apiRouter.use('/borrow-records', borrowRecordRoutes);

// Planned Items (Planned to Buy)
apiRouter.use('/planned-items', plannedItemRoutes);

// Dashboard
apiRouter.use('/dashboard', dashboardRoutes);

app.use('/api', apiRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected successfully');

    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: true });
      console.log('✅ Database synced');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 API v2 endpoints (all /api/* require Bearer token):`);
      console.log(`   🔑 Auth         /api/auth/login | /register | /me`);
      console.log(`   👥 Users        /api/users`);
      console.log(`   💻 Equipment     /api/equipment`);
      console.log(`   📋 Consumables   /api/consumables`);
      console.log(`   📦 Requests      /api/requests`);
      console.log(`   🔄 Borrow Recs   /api/borrow-records`);
      console.log(`   📊 Dashboard     /api/dashboard/investment | /expense`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
