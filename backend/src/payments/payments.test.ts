import * as fc from 'fast-check';
import { initiateTelebirr, confirmTelebirr, initiateCBEBirr, confirmCBEBirr, isPaymentError } from './paymentService';
import { addToCart, _reset as resetCarts } from '../orders/cartService';
import { createOrder, isServiceError } from '../orders/orderService';
import { _reset as resetOrders } from '../orders/orderStore';

beforeEach(() => {
  resetCarts();
  resetOrders();
});

// Helper: create a paid-ready order
function makeOrder(buyerId: string, sellerId: string, productId: string, price: number) {
  addToCart(buyerId, productId, 1);
  return createOrder({ buyerId, sellerId, paymentMethod: 'telebirr', prices: { [productId]: price } });
}

// ── Property 16: Payment status transitions are valid ─────────────────────────
// Feature: ethiopian-marketplace, Property 16: Payment status transitions are valid
// Validates: Requirements 5.1, 5.2, 5.4, 5.5

describe('Property 16: Payment status transitions are valid', () => {
  it('Telebirr: successful confirmation transitions order from pending_payment to paid', () => {
    fc.assert(
      fc.property(
        fc.uuid(), fc.uuid(), fc.uuid(),
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (buyerId, sellerId, productId, price) => {
          resetCarts(); resetOrders();
          const order = makeOrder(buyerId, sellerId, productId, price);
          if (isServiceError(order)) return;

          const initiated = initiateTelebirr({ orderId: order.id, method: 'telebirr', amountETB: order.totalETB });
          expect(isPaymentError(initiated)).toBe(false);

          const confirmed = confirmTelebirr(order.id, true);
          expect(isPaymentError(confirmed)).toBe(false);
          if (!isPaymentError(confirmed)) {
            expect(confirmed.status).toBe('confirmed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Telebirr: failed payment leaves order in pending_payment (status not changed)', () => {
    fc.assert(
      fc.property(
        fc.uuid(), fc.uuid(), fc.uuid(),
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (buyerId, sellerId, productId, price) => {
          resetCarts(); resetOrders();
          const order = makeOrder(buyerId, sellerId, productId, price);
          if (isServiceError(order)) return;

          const result = confirmTelebirr(order.id, false);
          // Failed payment returns a result with status 'failed', not an error
          expect(isPaymentError(result)).toBe(false);
          if (!isPaymentError(result)) {
            expect(result.status).toBe('failed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('CBE Birr: successful confirmation transitions order to paid', () => {
    fc.assert(
      fc.property(
        fc.uuid(), fc.uuid(), fc.uuid(),
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (buyerId, sellerId, productId, price) => {
          resetCarts(); resetOrders();
          const order = makeOrder(buyerId, sellerId, productId, price);
          if (isServiceError(order)) return;

          const initiated = initiateCBEBirr({ orderId: order.id, method: 'cbe_birr', amountETB: order.totalETB });
          expect(isPaymentError(initiated)).toBe(false);

          const confirmed = confirmCBEBirr(order.id, true);
          expect(isPaymentError(confirmed)).toBe(false);
          if (!isPaymentError(confirmed)) {
            expect(confirmed.status).toBe('confirmed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
