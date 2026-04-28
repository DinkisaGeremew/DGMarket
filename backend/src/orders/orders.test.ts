import * as fc from 'fast-check';
import { addToCart, removeFromCart, getCart, clearCart, _reset as resetCarts } from './cartService';
import { createOrder, updateOrderStatus, calculateTotal, isServiceError } from './orderService';
import { _reset as resetOrders } from './orderStore';
import { OrderItem, OrderStatus } from '@em/shared';

beforeEach(() => {
  resetCarts();
  resetOrders();
});

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbUserId = () => fc.uuid();
const arbProductId = () => fc.uuid();
const arbQuantity = () => fc.integer({ min: 1, max: 20 });
const arbPrice = () => fc.double({ min: 1, max: 10000, noNaN: true });

const arbOrderItem = (): fc.Arbitrary<OrderItem> =>
  fc.record({
    productId: arbProductId(),
    quantity: arbQuantity(),
    unitPriceETB: arbPrice(),
  });

// ── Property 12: Cart add and remove consistency ──────────────────────────────
// Feature: ethiopian-marketplace, Property 12: Cart add and remove consistency
// Validates: Requirements 4.1, 4.2

describe('Property 12: Cart add and remove consistency', () => {
  it('adding then removing a product returns cart to original state', () => {
    fc.assert(
      fc.property(arbUserId(), arbProductId(), arbQuantity(), (userId, productId, qty) => {
        resetCarts();
        const before = getCart(userId);
        addToCart(userId, productId, qty);
        removeFromCart(userId, productId);
        const after = getCart(userId);
        expect(after.items).toEqual(before.items);
      }),
      { numRuns: 100 }
    );
  });

  it('removing a product not in cart leaves cart unchanged', () => {
    fc.assert(
      fc.property(arbUserId(), arbProductId(), arbProductId(), (userId, p1, p2) => {
        if (p1 === p2) return;
        resetCarts();
        addToCart(userId, p1, 1);
        const before = getCart(userId);
        removeFromCart(userId, p2);
        const after = getCart(userId);
        expect(after.items).toEqual(before.items);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 13: Order total arithmetic invariant ─────────────────────────────
// Feature: ethiopian-marketplace, Property 13: Order total arithmetic invariant
// Validates: Requirements 4.3

describe('Property 13: Order total arithmetic invariant', () => {
  it('order total equals sum of unit price * quantity for all items', () => {
    fc.assert(
      fc.property(fc.array(arbOrderItem(), { minLength: 1, maxLength: 10 }), (items) => {
        const total = calculateTotal(items);
        const expected = items.reduce((sum, i) => sum + i.unitPriceETB * i.quantity, 0);
        expect(total).toBeCloseTo(expected, 5);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 14: Order confirmation clears cart ───────────────────────────────
// Feature: ethiopian-marketplace, Property 14: Order confirmation clears cart
// Validates: Requirements 4.4

describe('Property 14: Order confirmation clears cart', () => {
  it('after confirming an order, the cart is empty and an order record exists', () => {
    fc.assert(
      fc.property(
        arbUserId(),
        fc.uuid(),
        fc.array(
          fc.record({ productId: arbProductId(), quantity: arbQuantity(), price: arbPrice() }),
          { minLength: 1, maxLength: 5 }
        ),
        (buyerId, sellerId, cartItems) => {
          resetCarts();
          resetOrders();

          const prices: Record<string, number> = {};
          cartItems.forEach(({ productId, quantity, price }) => {
            addToCart(buyerId, productId, quantity);
            prices[productId] = price;
          });

          const order = createOrder({ buyerId, sellerId, paymentMethod: 'telebirr', prices });
          expect(isServiceError(order)).toBe(false);

          const cartAfter = getCart(buyerId);
          expect(cartAfter.items).toHaveLength(0);

          if (!isServiceError(order)) {
            expect(order.id).toBeTruthy();
            expect(order.buyerId).toBe(buyerId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: Empty cart checkout is rejected ──────────────────────────────
// Feature: ethiopian-marketplace, Property 15: Empty cart checkout is rejected
// Validates: Requirements 4.5

describe('Property 15: Empty cart checkout is rejected', () => {
  it('attempting to create an order with an empty cart returns EMPTY_CART error', () => {
    fc.assert(
      fc.property(arbUserId(), fc.uuid(), (buyerId, sellerId) => {
        resetCarts();
        resetOrders();
        const result = createOrder({ buyerId, sellerId, paymentMethod: 'telebirr', prices: {} });
        expect(isServiceError(result)).toBe(true);
        if (isServiceError(result)) {
          expect(result.code).toBe('EMPTY_CART');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 19: Order status transition correctness ─────────────────────────
// Feature: ethiopian-marketplace, Property 19: Order status transition correctness
// Validates: Requirements 7.2, 7.3

describe('Property 19: Order status transition correctness', () => {
  it('valid transitions persist the new status with an updated timestamp', () => {
    fc.assert(
      fc.property(arbUserId(), fc.uuid(), arbProductId(), arbQuantity(), arbPrice(), (buyerId, sellerId, productId, qty, price) => {
        resetCarts();
        resetOrders();

        addToCart(buyerId, productId, qty);
        const order = createOrder({
          buyerId,
          sellerId,
          paymentMethod: 'telebirr',
          prices: { [productId]: price },
        });
        if (isServiceError(order)) return;

        // pending_payment -> paid
        const paid = updateOrderStatus(order.id, 'paid');
        expect(isServiceError(paid)).toBe(false);
        if (!isServiceError(paid)) {
          expect(paid.status).toBe('paid');
          expect(paid.updatedAt >= order.updatedAt).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('invalid transitions are rejected', () => {
    fc.assert(
      fc.property(arbUserId(), fc.uuid(), arbProductId(), arbQuantity(), arbPrice(), (buyerId, sellerId, productId, qty, price) => {
        resetCarts();
        resetOrders();

        addToCart(buyerId, productId, qty);
        const order = createOrder({
          buyerId,
          sellerId,
          paymentMethod: 'telebirr',
          prices: { [productId]: price },
        });
        if (isServiceError(order)) return;

        // pending_payment -> shipped is invalid (must go through paid first)
        const result = updateOrderStatus(order.id, 'shipped');
        expect(isServiceError(result)).toBe(true);
        if (isServiceError(result)) {
          expect(result.code).toBe('INVALID_TRANSITION');
        }
      }),
      { numRuns: 100 }
    );
  });
});
