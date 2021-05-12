class Utils {
  /**
   * Check and invoke callback function
   */
  static invokeCallback(...args) {
    let cb = arguments[0];
    if (!!cb && typeof cb === "function") {
      cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
  }
}

module.exports = {
  Utils,
};
