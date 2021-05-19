"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeCallback = void 0;
/**
 * Check and invoke callback function
 */
const invokeCallback = function (...args) {
    let cb = arguments[0];
    if (!!cb && typeof cb === "function") {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};
exports.invokeCallback = invokeCallback;
