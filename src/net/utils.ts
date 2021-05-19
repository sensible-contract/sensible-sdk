/**
 * Check and invoke callback function
 */
export const invokeCallback = function (...args: any[]) {
  let cb = arguments[0];
  if (!!cb && typeof cb === "function") {
    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};
