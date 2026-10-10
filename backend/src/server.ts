import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import fixedExpenseRoutes from './routes/fixedExpenseRoutes';
import variableExpenseRoutes from './routes/variableExpenseRoutes';
import revenueRoutes from './routes/revenueRoutes';
import savingsRoutes from './routes/savingsRoutes';
import piggyBankRoutes from './routes/piggyBankRoutes';
import creditCardRoutes from './routes/creditCardRoutes';

dotenv.config();

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

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno no servidor',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CashBank Backend running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
