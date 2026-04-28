import { v4 as uuidv4 } from 'uuid';
import { Order, OrderItem, OrderStatus, PaymentMethod } from '@em/shared';
import * as orderStore from './orderStore';
import { getCart, clearCart } from './cartService';

// Platform commission rate — 8% of each order total
export const COMMISSION_RATE = 0.08;

// Platform payment account shown to buyers
export const PLATFORM_ACCOUNT = {
  telebirr: '0927333140',
  cbe_birr: '1000345140798',
  bank_transfer: 'CBE Account: 1000345140798',
};

export interface ServiceError {
  error: string;
  code: string;
}

export function isServiceError(val: unknown): val is ServiceError {
  return typeof val === 'object' && val !== null && 'code' in val && 'error' in val;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// ── Order creation ────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  buyerId: string;
  sellerId: string;
  paymentMethod: PaymentMethod;
  /** Unit prices keyed by productId — provided by caller from product catalog */
  prices: Record<string, number>;
}

export function createOrder(input: CreateOrderInput): Order | ServiceError {
  const cart = getCart(input.buyerId);

  if (cart.items.length === 0) {
    return { error: 'Cart is empty', code: 'EMPTY_CART' };
  }

  // Only use items that belong to this seller (filter by prices map provided)
  const sellerItems = cart.items.filter((ci) => input.prices[ci.productId] !== undefined);

  if (sellerItems.length === 0) {
    return { error: 'No items for this seller', code: 'EMPTY_CART' };
  }

  const items: OrderItem[] = sellerItems.map((ci) => ({
    productId: ci.productId,
    quantity: ci.quantity,
    unitPriceETB: input.prices[ci.productId] ?? 0,
  }));

  const totalETB = items.reduce((sum, i) => sum + i.unitPriceETB * i.quantity, 0);
  const commissionETB = Math.round(totalETB * COMMISSION_RATE);
  const sellerPayoutETB = totalETB - commissionETB;

  const now = new Date().toISOString();
  const order: Order = {
    id: uuidv4(),
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    items,
    totalETB,
    status: 'pending_payment',
    paymentMethod: input.paymentMethod,
    commissionRate: COMMISSION_RATE,
    commissionETB,
    sellerPayoutETB,
    payoutStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  orderStore.save(order);
  clearCart(input.buyerId);
  return order;
}

// ── Order retrieval ───────────────────────────────────────────────────────────

export function getOrder(id: string): Order | ServiceError {
  const order = orderStore.findById(id);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };
  return order;
}

// ── Status transitions ────────────────────────────────────────────────────────

export function updateOrderStatus(
  id: string,
  newStatus: OrderStatus
): Order | ServiceError {
  const order = orderStore.findById(id);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    return {
      error: `Cannot transition from ${order.status} to ${newStatus}`,
      code: 'INVALID_TRANSITION',
    };
  }

  const updated: Order = {
    ...order,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  orderStore.save(updated);
  return updated;
}

// ── Payment proof ─────────────────────────────────────────────────────────────

export function submitPaymentProof(
  orderId: string,
  buyerId: string,
  proof: string,
  transactionId?: string
): Order | ServiceError {
  const order = orderStore.findById(orderId);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };
  if (order.buyerId !== buyerId) return { error: 'Forbidden', code: 'FORBIDDEN' };
  if (order.status !== 'pending_payment') {
    return { error: 'Order is not pending payment', code: 'INVALID_TRANSITION' };
  }
  const updated: Order = {
    ...order,
    paymentProof: proof,
    ...(transactionId && { transactionId }),
    updatedAt: new Date().toISOString(),
  };
  orderStore.save(updated);
  return updated;
}

// ── Admin approve payment proof ───────────────────────────────────────────────

export function approvePaymentProof(orderId: string): Order | ServiceError {
  const order = orderStore.findById(orderId);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };
  if (order.status !== 'pending_payment') {
    return { error: 'Order is not pending payment', code: 'INVALID_TRANSITION' };
  }
  if (!order.paymentProof) {
    return { error: 'No payment proof uploaded yet', code: 'MISSING_PROOF' };
  }
  const updated: Order = {
    ...order,
    status: 'paid',
    updatedAt: new Date().toISOString(),
  };
  orderStore.save(updated);
  return updated;
}

// ── Total calculation helper (pure, for testing) ──────────────────────────────

export function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPriceETB * i.quantity, 0);
}

// ── Payout management (admin only) ───────────────────────────────────────────

export function releasePayout(orderId: string, note?: string): Order | ServiceError {
  const order = orderStore.findById(orderId);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };
  if (order.status !== 'delivered') {
    return { error: 'Can only release payout for delivered orders', code: 'INVALID_TRANSITION' };
  }
  if (order.payoutStatus === 'released') {
    return { error: 'Payout already released', code: 'ALREADY_RELEASED' };
  }
  const updated: Order = {
    ...order,
    payoutStatus: 'released',
    payoutNote: note,
    updatedAt: new Date().toISOString(),
  };
  orderStore.save(updated);
  return updated;
}

export function disputeOrder(orderId: string, note: string): Order | ServiceError {
  const order = orderStore.findById(orderId);
  if (!order) return { error: 'Order not found', code: 'NOT_FOUND' };
  if (order.payoutStatus === 'released') {
    return { error: 'Cannot dispute a released payout', code: 'INVALID_TRANSITION' };
  }
  const updated: Order = {
    ...order,
    payoutStatus: 'disputed',
    payoutNote: note,
    updatedAt: new Date().toISOString(),
  };
  orderStore.save(updated);
  return updated;
}
