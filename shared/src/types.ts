// Core shared TypeScript interfaces for the Ethiopian Marketplace

export type UserRole = 'buyer' | 'seller' | 'admin';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  businessName?: string;
  businessCategory?: string;
  isActive: boolean;
  verificationStatus?: VerificationStatus;
  verificationIdType?: 'national_id' | 'passport';
  verificationIdNumber?: string;
  verificationIdImage?: string; // base64
  verificationIdImageBack?: string; // base64 back side
  verificationSubmittedAt?: string;
  fanNumber?: string;
  fanOtpVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'telebirr' | 'cbe_birr' | 'bank_transfer';

export type PayoutStatus = 'pending' | 'released' | 'disputed';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPriceETB: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalETB: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentProof?: string; // base64 screenshot uploaded by buyer
  transactionId?: string; // Telebirr/CBE transaction ID entered by buyer
  // Escrow / commission fields
  commissionRate: number;       // e.g. 0.08 = 8%
  commissionETB: number;        // platform earnings from this order
  sellerPayoutETB: number;      // amount to release to seller
  payoutStatus: PayoutStatus;   // pending | released | disputed
  payoutNote?: string;          // admin note on dispute/release
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceETB: number;
  category: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OTPRecord {
  phone: string;
  code: string;
  expiresAt: string; // ISO date string
  used: boolean;
}

// Structured validation error returned on bad deserialization
export interface ValidationError {
  error: string;
  code: 'VALIDATION_ERROR';
  details: { field: string; message: string }[];
}

export type Language = 'en' | 'om'; // English | Oromo
