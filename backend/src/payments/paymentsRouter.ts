import { Router, Request, Response } from 'express';
import {
  initiateTelebirr, confirmTelebirr,
  initiateCBEBirr, confirmCBEBirr,
  initiateBankTransfer, confirmBankTransfer,
  isPaymentError,
} from './paymentService';

const router = Router();

// POST /api/payments/telebirr/initiate
router.post('/telebirr/initiate', (req: Request, res: Response) => {
  const { orderId, amountETB, phone } = req.body as { orderId?: string; amountETB?: number; phone?: string };
  if (!orderId || !amountETB) {
    res.status(400).json({ error: 'orderId and amountETB are required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = initiateTelebirr({ orderId, method: 'telebirr', amountETB, phone });
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

// POST /api/payments/telebirr/confirm
router.post('/telebirr/confirm', (req: Request, res: Response) => {
  const { orderId, success } = req.body as { orderId?: string; success?: boolean };
  if (!orderId) { res.status(400).json({ error: 'orderId is required', code: 'MISSING_FIELDS' }); return; }
  const result = confirmTelebirr(orderId, success ?? false);
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

// POST /api/payments/cbe/initiate
router.post('/cbe/initiate', (req: Request, res: Response) => {
  const { orderId, amountETB, phone } = req.body as { orderId?: string; amountETB?: number; phone?: string };
  if (!orderId || !amountETB) {
    res.status(400).json({ error: 'orderId and amountETB are required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = initiateCBEBirr({ orderId, method: 'cbe_birr', amountETB, phone });
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

// POST /api/payments/cbe/confirm
router.post('/cbe/confirm', (req: Request, res: Response) => {
  const { orderId, success } = req.body as { orderId?: string; success?: boolean };
  if (!orderId) { res.status(400).json({ error: 'orderId is required', code: 'MISSING_FIELDS' }); return; }
  const result = confirmCBEBirr(orderId, success ?? false);
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

// POST /api/payments/bank/initiate
router.post('/bank/initiate', (req: Request, res: Response) => {
  const { orderId, amountETB } = req.body as { orderId?: string; amountETB?: number };
  if (!orderId || !amountETB) {
    res.status(400).json({ error: 'orderId and amountETB are required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = initiateBankTransfer({ orderId, method: 'bank_transfer', amountETB });
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

// POST /api/payments/bank/confirm  (admin only in production)
router.post('/bank/confirm', (req: Request, res: Response) => {
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) { res.status(400).json({ error: 'orderId is required', code: 'MISSING_FIELDS' }); return; }
  const result = confirmBankTransfer(orderId);
  if (isPaymentError(result)) { res.status(400).json(result); return; }
  res.json(result);
});

export default router;
