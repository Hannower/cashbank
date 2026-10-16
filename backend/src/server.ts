import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load both root .env and local backend .env to ensure all configurations are loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import fixedExpenseRoutes from './routes/fixedExpenseRoutes';
import variableExpenseRoutes from './routes/variableExpenseRoutes';
import revenueRoutes from './routes/revenueRoutes';
import savingsRoutes from './routes/savingsRoutes';
import piggyBankRoutes from './routes/piggyBankRoutes';
import creditCardRoutes from './routes/creditCardRoutes';
import receivableRoutes from './routes/receivableRoutes';
import adminRoutes from './routes/adminRoutes';
import { prisma } from './prisma/client';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logger for debugging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CashBank Backend API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fixed-expenses', fixedExpenseRoutes);
app.use('/api/variable-expenses', variableExpenseRoutes);
app.use('/api/revenues', revenueRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/piggy-banks', piggyBankRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/admin', adminRoutes);

// Error handler with automatic persistence to systemErrorLog
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);

  prisma.systemErrorLog.create({
    data: {
      endpoint: req.originalUrl || req.url,
      method: req.method,
      statusCode: err.status || 500,
      message: err.message || 'Erro interno no servidor',
      stack: err.stack ? String(err.stack).slice(0, 2000) : null,
      userId: (req as any).userId || null,
      userEmail: (req as any).userEmail || null,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
    },
  }).catch(() => {});

  res.status(err.status || 500).json({
    message: err.message || 'Erro interno no servidor',
  });
});

async function ensureAdminUser() {
  try {
    const adminEmail = 'hannowersousa@gmail.com';
    const user = await prisma.user.findFirst({
      where: { email: { equals: adminEmail, mode: 'insensitive' } },
    });
    if (user && (user.role !== 'admin' || user.status !== 'active')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin', status: 'active' },
      });
      console.log(`🛡️ Administrador garantido com sucesso no startup: ${adminEmail}`);
    }
  } catch (e) {
    console.warn('Could not verify admin user on startup:', e);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 CashBank Backend running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  await ensureAdminUser();
});
