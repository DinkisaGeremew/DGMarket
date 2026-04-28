import { Router, Request, Response } from 'express';
import { addToCart, removeFromCart, getCart } from './cartService';
import { createOrder, getOrder, updateOrderStatus, submitPaymentProof, isServiceError } from './orderService';
import { getProduct } from '../products/productService';
import { findBySeller, findByBuyer } from './orderStore';
import { OrderStatus, PaymentMethod } from '@em/shared';

const router = Router();

// ── Cart endpoints ────────────────────────────────────────────────────────────

// GET /api/orders/cart/:userId
router.get('/cart/:userId', (req: Request, res: Response) => {
  res.json(getCart(req.params.userId));
});

// POST /api/orders/cart/:userId/add
router.post('/cart/:userId/add', (req: Request, res: Response) => {
  const { productId, quantity } = req.body as { productId?: string; quantity?: number };
  if (!productId || !quantity) {
    res.status(400).json({ error: 'productId and quantity are required', code: 'MISSING_FIELDS' });
    return;
  }
  // Prevent sellers from adding their own products to cart
  const product = getProduct(productId);
  if (!isServiceError(product) && product.sellerId === req.params.userId) {
    res.status(403).json({ error: 'You cannot add your own product to cart', code: 'FORBIDDEN' });
    return;
  }
  res.json(addToCart(req.params.userId, productId, quantity));
});

// DELETE /api/orders/cart/:userId/remove/:productId
router.delete('/cart/:userId/remove/:productId', (req: Request, res: Response) => {
  res.json(removeFromCart(req.params.userId, req.params.productId));
});

// ── Order endpoints ───────────────────────────────────────────────────────────

// POST /api/orders  — supports multi-seller: creates one order per seller, clears cart at end
router.post('/', (req: Request, res: Response) => {
  const { buyerId, paymentMethod, sellerOrders } = req.body as {
    buyerId?: string;
    paymentMethod?: PaymentMethod;
    // Array of { sellerId, prices } — one per seller
    sellerOrders?: { sellerId: string; prices: Record<string, number> }[];
  };

  if (!buyerId || !paymentMethod || !sellerOrders || sellerOrders.length === 0) {
    res.status(400).json({ error: 'buyerId, paymentMethod, sellerOrders are required', code: 'MISSING_FIELDS' });
    return;
  }

  const created = [];
  for (const so of sellerOrders) {
    const result = createOrder({ buyerId, sellerId: so.sellerId, paymentMethod, prices: so.prices });
    if (isServiceError(result)) {
      res.status(400).json(result);
      return;
    }
    created.push(result);
  }

  res.status(201).json(created);
});

// GET /api/orders/seller/:sellerId  — all orders for a seller
router.get('/seller/:sellerId', (req: Request, res: Response) => {
  res.json(findBySeller(req.params.sellerId));
});

// GET /api/orders/buyer/:buyerId  — all orders for a buyer
router.get('/buyer/:buyerId', (req: Request, res: Response) => {
  res.json(findByBuyer(req.params.buyerId));
});

// GET /api/orders/:id
router.get('/:id', (req: Request, res: Response) => {
  const result = getOrder(req.params.id);
  if (isServiceError(result)) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// POST /api/orders/:id/payment-proof
router.post('/:id/payment-proof', (req: Request, res: Response) => {
  const { buyerId, proof, transactionId } = req.body as { buyerId?: string; proof?: string; transactionId?: string };
  if (!buyerId || !proof) {
    res.status(400).json({ error: 'buyerId and proof are required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = submitPaymentProof(req.params.id, buyerId, proof, transactionId);
  if (isServiceError(result)) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 400;
    res.status(status).json(result);
    return;
  }
  res.json(result);
});

// PUT /api/orders/:id/status
router.put('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body as { status?: OrderStatus };
  if (!status) {
    res.status(400).json({ error: 'status is required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = updateOrderStatus(req.params.id, status);
  if (isServiceError(result)) {
    const code = result.code === 'NOT_FOUND' ? 404 : 400;
    res.status(code).json(result);
    return;
  }
  res.json(result);
});

export default router;
