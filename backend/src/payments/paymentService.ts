import { Order, PaymentMethod } from '@em/shared';
import { getOrder, updateOrderStatus, isServiceError } from '../orders/orderService';

export interface PaymentRequest {
  orderId: string;
  method: PaymentMethod;
  amountETB: number;
  phone?: string; // required for Telebirr and CBE Birr
}

export interface PaymentResult {
  orderId: string;
  method: PaymentMethod;
  status: 'initiated' | 'confirmed' | 'failed';
  transactionRef?: string;
  bankDetails?: BankDetails;
  message: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

export interface ServiceError {
  error: string;
  code: string;
}

export function isPaymentError(val: unknown): val is ServiceError {
  return typeof val === 'object' && val !== null && 'code' in val && 'error' in val;
}

// ── Telebirr ──────────────────────────────────────────────────────────────────
// In production: call Ethio Telecom Telebirr API
// Here we simulate the flow with a stub

export function initiateTelebirr(req: PaymentRequest): PaymentResult | ServiceError {
  const order = getOrder(req.orderId);
  if (isServiceError(order)) return order;

  if (order.status !== 'pending_payment') {
    return { error: 'Order is not in pending_payment status', code: 'INVALID_ORDER_STATUS' };
  }

  // Stub: simulate success (in production, call Telebirr API here)
  const transactionRef = `TLB-${Date.now()}`;
  return {
    orderId: req.orderId,
    method: 'telebirr',
    status: 'initiated',
    transactionRef,
    message: 'Telebirr payment initiated. Confirm on your phone.',
  };
}

export function confirmTelebirr(orderId: string, success: boolean): PaymentResult | ServiceError {
  if (!success) {
    return {
      orderId,
      method: 'telebirr',
      status: 'failed',
      message: 'Telebirr payment failed. Please retry.',
    };
  }

  const updated = updateOrderStatus(orderId, 'paid');
  if (isServiceError(updated)) return updated;

  return {
    orderId,
    method: 'telebirr',
    status: 'confirmed',
    transactionRef: `TLB-CONF-${Date.now()}`,
    message: 'Payment confirmed. Order is now paid.',
  };
}

// ── CBE Birr ──────────────────────────────────────────────────────────────────

export function initiateCBEBirr(req: PaymentRequest): PaymentResult | ServiceError {
  const order = getOrder(req.orderId);
  if (isServiceError(order)) return order;

  if (order.status !== 'pending_payment') {
    return { error: 'Order is not in pending_payment status', code: 'INVALID_ORDER_STATUS' };
  }

  const transactionRef = `CBE-${Date.now()}`;
  return {
    orderId: req.orderId,
    method: 'cbe_birr',
    status: 'initiated',
    transactionRef,
    message: 'CBE Birr payment initiated. Confirm on your phone.',
  };
}

export function confirmCBEBirr(orderId: string, success: boolean): PaymentResult | ServiceError {
  if (!success) {
    return {
      orderId,
      method: 'cbe_birr',
      status: 'failed',
      message: 'CBE Birr payment failed. Please retry.',
    };
  }

  const updated = updateOrderStatus(orderId, 'paid');
  if (isServiceError(updated)) return updated;

  return {
    orderId,
    method: 'cbe_birr',
    status: 'confirmed',
    transactionRef: `CBE-CONF-${Date.now()}`,
    message: 'Payment confirmed. Order is now paid.',
  };
}

// ── Bank Transfer ─────────────────────────────────────────────────────────────

export function initiateBankTransfer(req: PaymentRequest): PaymentResult | ServiceError {
  const order = getOrder(req.orderId);
  if (isServiceError(order)) return order;

  if (order.status !== 'pending_payment') {
    return { error: 'Order is not in pending_payment status', code: 'INVALID_ORDER_STATUS' };
  }

  const bankDetails: BankDetails = {
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '1000123456789',
    accountName: 'Ethiopian Marketplace Ltd',
    reference: `ORD-${req.orderId.slice(0, 8).toUpperCase()}`,
  };

  return {
    orderId: req.orderId,
    method: 'bank_transfer',
    status: 'initiated',
    bankDetails,
    message: 'Transfer to the account below. Order will be confirmed after payment verification.',
  };
}

// Admin confirms bank transfer manually
export function confirmBankTransfer(orderId: string): PaymentResult | ServiceError {
  const updated = updateOrderStatus(orderId, 'paid');
  if (isServiceError(updated)) return updated;

  return {
    orderId,
    method: 'bank_transfer',
    status: 'confirmed',
    message: 'Bank transfer confirmed. Order is now paid.',
  };
}
