"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLanguage = setLanguage;
exports.getLanguage = getLanguage;
exports._reset = _reset;
/**
 * Simple in-memory language preference store.
 * In the frontend this maps to localStorage; in tests it's in-memory.
 */
const store = new Map();
function setLanguage(userId, language) {
    store.set(userId, language);
}
function getLanguage(userId) {
    return store.get(userId) ?? 'en';
}
function _reset() {
    store.clear();
}
//# sourceMappingURL=languagePreference.js.map