if (!Buffer.prototype.readBigUInt64LE) {
  Buffer.prototype.readBigUInt64LE = function (offset) {
    let b1 = BigInt(this.readUInt32LE(offset + 0));
    let b2 = BigInt(this.readUInt32LE(offset + 4));
    return b1 + (b2 << BigInt(32));
  };
  Buffer.prototype.writeBigUInt64LE = function (num) {
    let b2 = num >> BigInt(32);
    let b1 = num - (b2 << BigInt(32));
    this.writeUInt32LE(parseInt(b1), 0);
    this.writeUInt32LE(parseInt(b2), 4);
  };
}
if (typeof window !== "undefined" && typeof window.Buffer == "undefined") {
  const Buffer = require("buffer/index").Buffer;
  window.Buffer = Buffer;
}
