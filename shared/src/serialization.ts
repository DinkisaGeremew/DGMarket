import { User, Product, Order, Cart, ValidationError } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function missingFields(obj: Record<string, unknown>, required: string[]): string[] {
  return required.filter((f) => obj[f] === undefined || obj[f] === null);
}

function makeError(fields: string[]): ValidationError {
  return {
    error: 'Missing required fields',
    code: 'VALIDATION_ERROR',
    details: fields.map((f) => ({ field: f, message: `${f} is required` })),
  };
}

// ── User ─────────────────────────────────────────────────────────────────────

const USER_REQUIRED = ['id', 'role', 'isActive', 'createdAt', 'updatedAt'];

export function serializeUser(user: User): string {
  return JSON.stringify(user);
}

export function deserializeUser(json: string): User | ValidationError {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
  }
  const missing = missingFields(obj, USER_REQUIRED);
  if (missing.length > 0) return makeError(missing);
  return obj as unknown as User;
}

// ── Product ───────────────────────────────────────────────────────────────────

const PRODUCT_REQUIRED = [
  'id', 'sellerId', 'title', 'description',
  'priceETB', 'category', 'images', 'isActive', 'createdAt', 'updatedAt',
];

export function serializeProduct(product: Product): string {
  return JSON.stringify(product);
}

export function deserializeProduct(json: string): Product | ValidationError {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
  }
  const missing = missingFields(obj, PRODUCT_REQUIRED);
  if (missing.length > 0) return makeError(missing);
  return obj as unknown as Product;
}

// ── Order ─────────────────────────────────────────────────────────────────────

const ORDER_REQUIRED = [
  'id', 'buyerId', 'sellerId', 'items',
  'totalETB', 'status', 'paymentMethod',
  'commissionRate', 'commissionETB', 'sellerPayoutETB', 'payoutStatus',
  'createdAt', 'updatedAt',
];

export function serializeOrder(order: Order): string {
  return JSON.stringify(order);
}

export function deserializeOrder(json: string): Order | ValidationError {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
  }
  const missing = missingFields(obj, ORDER_REQUIRED);
  if (missing.length > 0) return makeError(missing);
  return obj as unknown as Order;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

const CART_REQUIRED = ['userId', 'items'];

export function serializeCart(cart: Cart): string {
  return JSON.stringify(cart);
}

export function deserializeCart(json: string): Cart | ValidationError {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
  }
  const missing = missingFields(obj, CART_REQUIRED);
  if (missing.length > 0) return makeError(missing);
  return obj as unknown as Cart;
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isValidationError(val: unknown): val is ValidationError {
  return (
    typeof val === 'object' &&
    val !== null &&
    (val as ValidationError).code === 'VALIDATION_ERROR'
  );
}
