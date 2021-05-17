var BN = require("elliptic/node_modules/bn.js");
BN.prototype.toBuffer = function toBuffer(endian, length) {
  return this.toArrayLike(Buffer, endian, length);
};
var window = window;
if (window) {
  window.Buffer = Buffer;
}
if (!Buffer.prototype.readBigUInt64LE) {
  Buffer.prototype.readBigUInt64LE = function (offset) {
    let b1 = BigInt(this.readUInt32LE(offset + 0));
    let b2 = BigInt(this.readUInt32LE(offset + 4));
    return b1 + (b2 << BigInt(32));
  };
  Buffer.prototype.writeBigUInt64LE = function (num) {
    let b2 = num >> 32n;
    let b1 = num - (b2 << BigInt(32));
    this.writeUInt32LE(parseInt(b1), 0);
    this.writeUInt32LE(parseInt(b2), 4);
  };
}
