import { v4 as uuidv4 } from 'uuid';
import { Product } from '@em/shared';
import * as store from './productStore';

export interface ProductInput {
  sellerId: string;
  title: string;
  description: string;
  priceETB: number;
  category: string;
  images: string[];
  location?: string;
}

export interface ProductFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  page?: number;
}

export interface PagedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceError {
  error: string;
  code: string;
  details?: { field: string; message: string }[];
}

export function isServiceError(val: unknown): val is ServiceError {
  return typeof val === 'object' && val !== null && 'code' in val && 'error' in val;
}

const PAGE_SIZE = 24;

// ── Validation ────────────────────────────────────────────────────────────────

function validateInput(input: Partial<ProductInput>): ServiceError | null {
  const missing: { field: string; message: string }[] = [];
  if (!input.title?.trim()) missing.push({ field: 'title', message: 'title is required' });
  if (!input.description?.trim()) missing.push({ field: 'description', message: 'description is required' });
  if (input.priceETB === undefined || input.priceETB === null)
    missing.push({ field: 'priceETB', message: 'priceETB is required' });
  if (!input.category?.trim()) missing.push({ field: 'category', message: 'category is required' });
  if (!input.images || input.images.length === 0)
    missing.push({ field: 'images', message: 'at least one image is required' });
  if (!input.sellerId?.trim()) missing.push({ field: 'sellerId', message: 'sellerId is required' });

  if (missing.length > 0) {
    return { error: 'Missing required fields', code: 'VALIDATION_ERROR', details: missing };
  }
  return null;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function createProduct(input: ProductInput): Product | ServiceError {
  // Normalize string fields before validation
  const normalized: ProductInput = {
    ...input,
    title: input.title?.trim() ?? '',
    description: input.description?.trim() ?? '',
    category: input.category?.trim() ?? '',
    sellerId: input.sellerId?.trim() ?? '',
  };
  const err = validateInput(normalized);
  if (err) return err;

  const now = new Date().toISOString();
  const product: Product = {
    id: uuidv4(),
    sellerId: normalized.sellerId,
    title: normalized.title,
    description: normalized.description,
    priceETB: normalized.priceETB,
    category: normalized.category,
    images: normalized.images,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  store.save(product);
  return product;
}

export function getProduct(id: string): Product | ServiceError {
  const product = store.findById(id);
  if (!product) return { error: 'Product not found', code: 'NOT_FOUND' };
  return product;
}

export function updateProduct(
  id: string,
  sellerId: string,
  updates: Partial<Omit<ProductInput, 'sellerId'>>
): Product | ServiceError {
  const product = store.findById(id);
  if (!product) return { error: 'Product not found', code: 'NOT_FOUND' };
  if (product.sellerId !== sellerId) return { error: 'Forbidden', code: 'FORBIDDEN' };

  const updated: Product = {
    ...product,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  store.save(updated);
  return updated;
}

export function deactivateProduct(id: string, sellerId: string): Product | ServiceError {
  const product = store.findById(id);
  if (!product) return { error: 'Product not found', code: 'NOT_FOUND' };
  if (product.sellerId !== sellerId) return { error: 'Forbidden', code: 'FORBIDDEN' };

  const updated: Product = { ...product, isActive: false, updatedAt: new Date().toISOString() };
  store.save(updated);
  return updated;
}

// ── Search & filter ───────────────────────────────────────────────────────────

export function searchProducts(filters: ProductFilters): PagedProducts {
  const page = Math.max(1, filters.page ?? 1);
  let results = store.findActive();

  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    const cat = filters.category.toLowerCase();
    results = results.filter((p) => p.category.toLowerCase() === cat);
  }

  if (filters.minPrice !== undefined) {
    results = results.filter((p) => p.priceETB >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    results = results.filter((p) => p.priceETB <= filters.maxPrice!);
  }

  const total = results.length;
  const start = (page - 1) * PAGE_SIZE;
  const items = results.slice(start, start + PAGE_SIZE);

  return { items, total, page, pageSize: PAGE_SIZE };
}
