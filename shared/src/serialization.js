"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeUser = serializeUser;
exports.deserializeUser = deserializeUser;
exports.serializeProduct = serializeProduct;
exports.deserializeProduct = deserializeProduct;
exports.serializeOrder = serializeOrder;
exports.deserializeOrder = deserializeOrder;
exports.serializeCart = serializeCart;
exports.deserializeCart = deserializeCart;
exports.isValidationError = isValidationError;
// ── Helpers ──────────────────────────────────────────────────────────────────
function missingFields(obj, required) {
    return required.filter((f) => obj[f] === undefined || obj[f] === null);
}
function makeError(fields) {
    return {
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        details: fields.map((f) => ({ field: f, message: `${f} is required` })),
    };
}
// ── User ─────────────────────────────────────────────────────────────────────
const USER_REQUIRED = ['id', 'role', 'isActive', 'createdAt', 'updatedAt'];
function serializeUser(user) {
    return JSON.stringify(user);
}
function deserializeUser(json) {
    let obj;
    try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
        }
        obj = parsed;
    }
    catch {
        return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    const missing = missingFields(obj, USER_REQUIRED);
    if (missing.length > 0)
        return makeError(missing);
    return obj;
}
// ── Product ───────────────────────────────────────────────────────────────────
const PRODUCT_REQUIRED = [
    'id', 'sellerId', 'title', 'description',
    'priceETB', 'category', 'images', 'isActive', 'createdAt', 'updatedAt',
];
function serializeProduct(product) {
    return JSON.stringify(product);
}
function deserializeProduct(json) {
    let obj;
    try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
        }
        obj = parsed;
    }
    catch {
        return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    const missing = missingFields(obj, PRODUCT_REQUIRED);
    if (missing.length > 0)
        return makeError(missing);
    return obj;
}
// ── Order ─────────────────────────────────────────────────────────────────────
const ORDER_REQUIRED = [
    'id', 'buyerId', 'sellerId', 'items',
    'totalETB', 'status', 'paymentMethod',
    'commissionRate', 'commissionETB', 'sellerPayoutETB', 'payoutStatus',
    'createdAt', 'updatedAt',
];
function serializeOrder(order) {
    return JSON.stringify(order);
}
function deserializeOrder(json) {
    let obj;
    try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
        }
        obj = parsed;
    }
    catch {
        return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    const missing = missingFields(obj, ORDER_REQUIRED);
    if (missing.length > 0)
        return makeError(missing);
    return obj;
}
// ── Cart ──────────────────────────────────────────────────────────────────────
const CART_REQUIRED = ['userId', 'items'];
function serializeCart(cart) {
    return JSON.stringify(cart);
}
function deserializeCart(json) {
    let obj;
    try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
        }
        obj = parsed;
    }
    catch {
        return { error: 'Invalid JSON', code: 'VALIDATION_ERROR', details: [] };
    }
    const missing = missingFields(obj, CART_REQUIRED);
    if (missing.length > 0)
        return makeError(missing);
    return obj;
}
// ── Type guard ────────────────────────────────────────────────────────────────
function isValidationError(val) {
    return (typeof val === 'object' &&
        val !== null &&
        val.code === 'VALIDATION_ERROR');
}
//# sourceMappingURL=serialization.js.map