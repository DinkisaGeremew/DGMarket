import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './auth/authRouter';
import productsRouter from './products/productsRouter';
import ordersRouter from './orders/ordersRouter';
import paymentsRouter from './payments/paymentsRouter';
import adminRouter from './admin/adminRouter';

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

// Serve frontend static files in production (only when frontend/dist exists)
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND === 'true') {
  const frontendDist = path.join(__dirname, '../../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
});

export default app;
