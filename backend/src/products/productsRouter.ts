import { Router, Request, Response } from 'express';
import {
  createProduct,
  getProduct,
  updateProduct,
  deactivateProduct,
  searchProducts,
  isServiceError,
} from './productService';

const router = Router();

// GET /api/products?query=&category=&minPrice=&maxPrice=&page=
router.get('/', (req: Request, res: Response) => {
  const { query, category, minPrice, maxPrice, page } = req.query as Record<string, string>;
  const result = searchProducts({
    query,
    category,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    page: page ? parseInt(page, 10) : 1,
  });
  res.json(result);
});

// GET /api/products/:id
router.get('/:id', (req: Request, res: Response) => {
  const result = getProduct(req.params.id);
  if (isServiceError(result)) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// POST /api/products
router.post('/', (req: Request, res: Response) => {
  const result = createProduct(req.body);
  if (isServiceError(result)) {
    res.status(400).json(result);
    return;
  }
  res.status(201).json(result);
});

// PUT /api/products/:id
router.put('/:id', (req: Request, res: Response) => {
  const { sellerId, ...updates } = req.body as { sellerId: string };
  if (!sellerId) {
    res.status(400).json({ error: 'sellerId is required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = updateProduct(req.params.id, sellerId, updates);
  if (isServiceError(result)) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 400;
    res.status(status).json(result);
    return;
  }
  res.json(result);
});

// DELETE /api/products/:id  (deactivate)
router.delete('/:id', (req: Request, res: Response) => {
  const { sellerId } = req.body as { sellerId: string };
  if (!sellerId) {
    res.status(400).json({ error: 'sellerId is required', code: 'MISSING_FIELDS' });
    return;
  }
  const result = deactivateProduct(req.params.id, sellerId);
  if (isServiceError(result)) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 400;
    res.status(status).json(result);
    return;
  }
  res.json(result);
});

export default router;
