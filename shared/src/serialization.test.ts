import * as fc from 'fast-check';
import {
  serializeUser, deserializeUser,
  serializeProduct, deserializeProduct,
  serializeOrder, deserializeOrder,
  serializeCart, deserializeCart,
  isValidationError,
} from './serialization';
import { User, Product, Order, Cart, OrderItem, CartItem } from './types';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const isoDate = () => fc.date().map((d) => d.toISOString());

const arbUser = (): fc.Arbitrary<User> =>
  fc.record({
    id: fc.uuid(),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    phone: fc.option(fc.stringMatching(/^\+2519\d{8}$/), { nil: undefined }),
    passwordHash: fc.option(fc.string({ minLength: 10 }), { nil: undefined }),
    role: fc.constantFrom('buyer', 'seller', 'admin') as fc.Arbitrary<User['role']>,
    businessName: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: undefined }),
    businessCategory: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
    isActive: fc.boolean(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  });

const arbProduct = (): fc.Arbitrary<Product> =>
  fc.record({
    id: fc.uuid(),
    sellerId: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 120 }),
    description: fc.string({ minLength: 1, maxLength: 500 }),
    priceETB: fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
    category: fc.string({ minLength: 1, maxLength: 60 }),
    images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
    isActive: fc.boolean(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  });

const arbOrderItem = (): fc.Arbitrary<OrderItem> =>
  fc.record({
    productId: fc.uuid(),
    quantity: fc.integer({ min: 1, max: 100 }),
    unitPriceETB: fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
  });

const arbOrder = (): fc.Arbitrary<Order> =>
  fc.record({
    id: fc.uuid(),
    buyerId: fc.uuid(),
    sellerId: fc.uuid(),
    items: fc.array(arbOrderItem(), { minLength: 1, maxLength: 10 }),
    totalETB: fc.double({ min: 0.01, max: 10_000_000, noNaN: true }),
    status: fc.constantFrom(
      'pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'
    ) as fc.Arbitrary<Order['status']>,
    paymentMethod: fc.constantFrom(
      'telebirr', 'cbe_birr', 'bank_transfer'
    ) as fc.Arbitrary<Order['paymentMethod']>,
    commissionRate: fc.double({ min: 0, max: 1, noNaN: true }),
    commissionETB: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    sellerPayoutETB: fc.double({ min: 0, max: 10_000_000, noNaN: true }),
    payoutStatus: fc.constantFrom('pending', 'released', 'disputed') as fc.Arbitrary<Order['payoutStatus']>,
    createdAt: isoDate(),
    updatedAt: isoDate(),
  });

const arbCartItem = (): fc.Arbitrary<CartItem> =>
  fc.record({
    productId: fc.uuid(),
    quantity: fc.integer({ min: 1, max: 100 }),
  });

const arbCart = (): fc.Arbitrary<Cart> =>
  fc.record({
    userId: fc.uuid(),
    items: fc.array(arbCartItem(), { minLength: 0, maxLength: 20 }),
  });

// ── Property 20: Serialization round-trip ─────────────────────────────────────
// Feature: ethiopian-marketplace, Property 20: Serialization round-trip
// Validates: Requirements 9.1, 9.2

describe('Property 20: Serialization round-trip', () => {
  it('User: serialize then deserialize returns equivalent object', () => {
    fc.assert(
      fc.property(arbUser(), (user) => {
        const result = deserializeUser(serializeUser(user));
        expect(isValidationError(result)).toBe(false);
        expect(result).toEqual(user);
      }),
      { numRuns: 100 }
    );
  });

  it('Product: serialize then deserialize returns equivalent object', () => {
    fc.assert(
      fc.property(arbProduct(), (product) => {
        const result = deserializeProduct(serializeProduct(product));
        expect(isValidationError(result)).toBe(false);
        expect(result).toEqual(product);
      }),
      { numRuns: 100 }
    );
  });

  it('Order: serialize then deserialize returns equivalent object', () => {
    fc.assert(
      fc.property(arbOrder(), (order) => {
        const result = deserializeOrder(serializeOrder(order));
        expect(isValidationError(result)).toBe(false);
        expect(result).toEqual(order);
      }),
      { numRuns: 100 }
    );
  });

  it('Cart: serialize then deserialize returns equivalent object', () => {
    fc.assert(
      fc.property(arbCart(), (cart) => {
        const result = deserializeCart(serializeCart(cart));
        expect(isValidationError(result)).toBe(false);
        expect(result).toEqual(cart);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 21: Invalid JSON deserialization returns structured error ─────────
// Feature: ethiopian-marketplace, Property 21: Invalid JSON deserialization returns structured error
// Validates: Requirements 9.3

describe('Property 21: Invalid JSON deserialization returns structured error', () => {
  // Remove a required field from a valid object and verify rejection
  it('User: missing required field returns VALIDATION_ERROR', () => {
    fc.assert(
      fc.property(arbUser(), fc.constantFrom('id', 'role', 'isActive', 'createdAt', 'updatedAt'), (user, field) => {
        const obj = JSON.parse(serializeUser(user)) as Record<string, unknown>;
        delete obj[field];
        const result = deserializeUser(JSON.stringify(obj));
        expect(isValidationError(result)).toBe(true);
        if (isValidationError(result)) {
          expect(result.code).toBe('VALIDATION_ERROR');
          expect(result.details.some((d) => d.field === field)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Product: missing required field returns VALIDATION_ERROR', () => {
    const requiredFields = ['id', 'sellerId', 'title', 'description', 'priceETB', 'category', 'images', 'isActive', 'createdAt', 'updatedAt'];
    fc.assert(
      fc.property(arbProduct(), fc.constantFrom(...requiredFields), (product, field) => {
        const obj = JSON.parse(serializeProduct(product)) as Record<string, unknown>;
        delete obj[field];
        const result = deserializeProduct(JSON.stringify(obj));
        expect(isValidationError(result)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Order: missing required field returns VALIDATION_ERROR', () => {
    const requiredFields = ['id', 'buyerId', 'sellerId', 'items', 'totalETB', 'status', 'paymentMethod', 'commissionRate', 'commissionETB', 'sellerPayoutETB', 'payoutStatus', 'createdAt', 'updatedAt'];
    fc.assert(
      fc.property(arbOrder(), fc.constantFrom(...requiredFields), (order, field) => {
        const obj = JSON.parse(serializeOrder(order)) as Record<string, unknown>;
        delete obj[field];
        const result = deserializeOrder(JSON.stringify(obj));
        expect(isValidationError(result)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Cart: missing required field returns VALIDATION_ERROR', () => {
    fc.assert(
      fc.property(arbCart(), fc.constantFrom('userId', 'items'), (cart, field) => {
        const obj = JSON.parse(serializeCart(cart)) as Record<string, unknown>;
        delete obj[field];
        const result = deserializeCart(JSON.stringify(obj));
        expect(isValidationError(result)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns VALIDATION_ERROR for completely invalid JSON string', () => {
    const badInputs = ['not json', '', '{unclosed', 'null', '[]'];
    for (const input of badInputs) {
      expect(isValidationError(deserializeUser(input))).toBe(true);
      expect(isValidationError(deserializeProduct(input))).toBe(true);
      expect(isValidationError(deserializeOrder(input))).toBe(true);
      expect(isValidationError(deserializeCart(input))).toBe(true);
    }
  });
});
