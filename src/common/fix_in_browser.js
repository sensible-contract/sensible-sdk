var BN = require("elliptic/node_modules/bn.js");
BN.prototype.toBuffer = function toBuffer(endian, length) {
  return this.toArrayLike(Buffer, endian, length);
};
