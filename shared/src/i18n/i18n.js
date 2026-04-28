"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = t;
exports.getAllKeys = getAllKeys;
exports.isComplete = isComplete;
const en_json_1 = __importDefault(require("./en.json"));
const om_json_1 = __importDefault(require("./om.json"));
const translations = { en: en_json_1.default, om: om_json_1.default };
/**
 * Look up a translation key for the given language.
 * Returns the key itself if no translation is found.
 */
function t(key, language) {
    return translations[language]?.[key] ?? key;
}
/** Returns all translation keys defined in the English file (source of truth) */
function getAllKeys() {
    return Object.keys(en_json_1.default);
}
/** Returns true if both languages have a non-empty value for every key */
function isComplete() {
    return getAllKeys().every((key) => typeof en_json_1.default[key] === 'string' &&
        en_json_1.default[key].length > 0 &&
        typeof om_json_1.default[key] === 'string' &&
        om_json_1.default[key].length > 0);
}
//# sourceMappingURL=i18n.js.map