const { bsv } = require("scryptlib");

const TokenUtil = module.exports;

TokenUtil.RABIN_SIG_LEN = 128;

TokenUtil.toBufferLE = function (num, width) {
  const hex = num.toString(16);
  const buffer = Buffer.from(
    hex.padStart(width * 2, "0").slice(0, width * 2),
    "hex"
  );
  buffer.reverse();
  return buffer;
};

TokenUtil.getUInt8Buf = function (amount) {
  const buf = Buffer.alloc(1, 0);
  buf.writeUInt8(amount);
  return buf;
};

TokenUtil.getUInt16Buf = function (amount) {
  const buf = Buffer.alloc(2, 0);
  buf.writeUInt16LE(amount);
  return buf;
};

TokenUtil.getUInt32Buf = function (index) {
  const buf = Buffer.alloc(4, 0);
  buf.writeUInt32LE(index);
  return buf;
};

TokenUtil.getUInt64Buf = function (amount) {
  const buf = Buffer.alloc(8, 0);
  buf.writeBigUInt64LE(BigInt(amount));
  return buf;
};

TokenUtil.getTxIdBuf = function (txid) {
  const buf = Buffer.from(txid, "hex").reverse();
  return buf;
};

TokenUtil.getScriptHashBuf = function (scriptBuf) {
  const buf = Buffer.from(bsv.crypto.Hash.sha256ripemd160(scriptBuf));
  return buf;
};

TokenUtil.writeVarint = function (buf) {
  const n = buf.length;

  let res = Buffer.alloc(0);
  if (n < 0xfd) {
    header = TokenUtil.getUInt8Buf(n);
  } else if (n < 0x10000) {
    header = Buffer.concat([
      Buffer.from("fd", "hex"),
      TokenUtil.getUInt16Buf(n),
    ]);
  } else if (n < 0x100000000) {
    header = Buffer.concat([
      Buffer.from("fe", "hex"),
      TokenUtil.getUInt32Buf(n),
    ]);
  } else if (n < 0x10000000000000000) {
    header = Buffer.concat([
      Buffer.from("ff", "hex"),
      TokenUtil.getUInt64Buf(n),
    ]);
  }

  return Buffer.concat([header, buf]);
};
