import { Router, Request, Response } from 'express';
import {
  getDashboardMetrics,
  getAllOrders,
  adminReleasePayout,
  adminDisputeOrder,
  deactivateSeller,
  removeListing,
  deleteUser,
  isServiceError,
} from './adminService';
import { approvePaymentProof } from '../orders/orderService';

const router = Router();

// GET /api/admin/dashboard
router.get('/dashboard', (_req: Request, res: Response) => {
  res.json(getDashboardMetrics());
});

// GET /api/admin/users
router.get('/users', (_req: Request, res: Response) => {
  const { findAll } = require('../auth/userStore');
  const users = findAll().map(({ passwordHash: _, ...u }: { passwordHash: unknown; [key: string]: unknown }) => u);
  res.json(users);
});

// GET /api/admin/orders
router.get('/orders', (_req: Request, res: Response) => {
  res.json(getAllOrders());
});

// GET /api/admin/products
router.get('/products', (_req: Request, res: Response) => {
  const { findAll } = require('../products/productStore');
  res.json(findAll());
});

// POST /api/admin/orders/:id/approve-payment
router.post('/orders/:id/approve-payment', (req: Request, res: Response) => {
  const result = approvePaymentProof(req.params.id);
  if (isServiceError(result)) {
    res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    return;
  }
  res.json(result);
});

// POST /api/admin/orders/:id/release-payout
router.post('/orders/:id/release-payout', (req: Request, res: Response) => {
  const { note } = req.body as { note?: string };
  const result = adminReleasePayout(req.params.id, note);
  if (isServiceError(result)) {
    res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    return;
  }
  res.json(result);
});

// POST /api/admin/orders/:id/dispute
router.post('/orders/:id/dispute', (req: Request, res: Response) => {
  const { note } = req.body as { note?: string };
  if (!note) { res.status(400).json({ error: 'Dispute note is required' }); return; }
  const result = adminDisputeOrder(req.params.id, note);
  if (isServiceError(result)) {
    res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    return;
  }
  res.json(result);
});

// PUT /api/admin/sellers/:id/deactivate
router.put('/sellers/:id/deactivate', (req: Request, res: Response) => {
  const result = deactivateSeller(req.params.id);
  if (isServiceError(result)) {
    res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    return;
  }
  res.json(result);
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', (req: Request, res: Response) => {
  const result = removeListing(req.params.id);
  if (isServiceError(result)) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req: Request, res: Response) => {
  const { force } = req.query as { force?: string };
  const result = deleteUser(req.params.id, force === 'true');
  if (isServiceError(result)) {
    res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    return;
  }
  res.json(result);
});

// GET /api/admin/verifications — list pending seller verifications
router.get('/verifications', (_req: Request, res: Response) => {
  const { findAll } = require('../auth/userStore');
  const pending = findAll()
    .filter((u: { verificationStatus?: string }) => u.verificationStatus === 'pending')
    .map(({ passwordHash: _, ...u }: { passwordHash: unknown; [key: string]: unknown }) => u);
  res.json(pending);
});

// POST /api/admin/verifications/:id/approve
router.post('/verifications/:id/approve', (req: Request, res: Response) => {
  const { findById, save } = require('../auth/userStore');
  const user = findById(req.params.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  save({ ...user, verificationStatus: 'verified', updatedAt: new Date().toISOString() });
  res.json({ success: true });
});

// POST /api/admin/verifications/:id/reject
router.post('/verifications/:id/reject', (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  const { findById, save } = require('../auth/userStore');
  const user = findById(req.params.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  save({ ...user, verificationStatus: 'rejected', verificationRejectReason: reason ?? 'Documents unclear', updatedAt: new Date().toISOString() });
  res.json({ success: true });
});

export default router;
