import * as userStore from '../auth/userStore';
import * as productStore from '../products/productStore';
import * as orderStore from '../orders/orderStore';
import { releasePayout, disputeOrder } from '../orders/orderService';
import { Order } from '@em/shared';

export interface DashboardMetrics {
  totalUsers: number;
  activeListings: number;
  totalOrders: number;
  totalCommissionETB: number;
  pendingPayoutETB: number;
  pendingPayoutCount: number;
  disputedCount: number;
  ordersNeedingAttention: number;
}

export interface ServiceError {
  error: string;
  code: string;
}

export function isServiceError(val: unknown): val is ServiceError {
  return typeof val === 'object' && val !== null && 'code' in val && 'error' in val;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export function getDashboardMetrics(): DashboardMetrics {
  const orders = orderStore.findAll();
  const paidOrDelivered = orders.filter((o) => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered');
  const totalCommissionETB = paidOrDelivered.reduce((sum, o) => sum + (o.commissionETB ?? 0), 0);
  const pendingPayout = orders.filter((o) => o.status === 'delivered' && o.payoutStatus === 'pending');
  const pendingPayoutETB = pendingPayout.reduce((sum, o) => sum + (o.sellerPayoutETB ?? 0), 0);
  const disputedCount = orders.filter((o) => o.payoutStatus === 'disputed').length;
  // Orders needing attention: paid but no action from seller for a while, or disputed
  const ordersNeedingAttention = orders.filter(
    (o) => o.status === 'paid' || o.payoutStatus === 'disputed'
  ).length;

  return {
    totalUsers: userStore.findAll().length,
    activeListings: productStore.findActive().length,
    totalOrders: orders.length,
    totalCommissionETB,
    pendingPayoutETB,
    pendingPayoutCount: pendingPayout.length,
    disputedCount,
    ordersNeedingAttention,
  };
}

// ── All orders (admin view) ───────────────────────────────────────────────────

export function getAllOrders(): Order[] {
  return orderStore.findAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ── Payout management ─────────────────────────────────────────────────────────

export function adminReleasePayout(orderId: string, note?: string) {
  return releasePayout(orderId, note);
}

export function adminDisputeOrder(orderId: string, note: string) {
  return disputeOrder(orderId, note);
}

// ── User management ───────────────────────────────────────────────────────────

export function deactivateSeller(sellerId: string): { success: boolean } | ServiceError {
  const user = userStore.findById(sellerId);
  if (!user) return { error: 'User not found', code: 'NOT_FOUND' };
  if (user.role !== 'seller') return { error: 'User is not a seller', code: 'INVALID_ROLE' };

  userStore.save({ ...user, isActive: false, updatedAt: new Date().toISOString() });

  productStore
    .findAll()
    .filter((p) => p.sellerId === sellerId)
    .forEach((p) =>
      productStore.save({ ...p, isActive: false, updatedAt: new Date().toISOString() })
    );

  return { success: true };
}

export function removeListing(productId: string): { success: boolean } | ServiceError {
  const product = productStore.findById(productId);
  if (!product) return { error: 'Product not found', code: 'NOT_FOUND' };
  productStore.save({ ...product, isActive: false, updatedAt: new Date().toISOString() });
  return { success: true };
}

export function deleteUser(
  userId: string,
  forceDelete: boolean
): { success: boolean; requiresConfirmation?: boolean } | ServiceError {
  const user = userStore.findById(userId);
  if (!user) return { error: 'User not found', code: 'NOT_FOUND' };

  const activeOrders = orderStore
    .findByBuyer(userId)
    .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');

  if (activeOrders.length > 0 && !forceDelete) {
    return { success: false, requiresConfirmation: true };
  }

  userStore.save({ ...user, isActive: false, updatedAt: new Date().toISOString() });
  return { success: true };
}
