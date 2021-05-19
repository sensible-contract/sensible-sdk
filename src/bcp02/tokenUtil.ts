import { bsv } from "scryptlib";

export const RABIN_SIG_LEN = 128;

export let toBufferLE = function (num: number, width: number) {
  const hex = num.toString(16);
  const buffer = Buffer.from(
    hex.padStart(width * 2, "0").slice(0, width * 2),
    "hex"
  );
  buffer.reverse();
  return buffer;
};

export let getUInt8Buf = function (amount: number) {
  const buf = Buffer.alloc(1, 0);
  buf.writeUInt8(amount);
  return buf;
};

export let getUInt16Buf = function (amount: number) {
  const buf = Buffer.alloc(2, 0);
  buf.writeUInt16LE(amount);
  return buf;
};

export let getUInt32Buf = function (index: number) {
  const buf = Buffer.alloc(4, 0);
  buf.writeUInt32LE(index);
  return buf;
};

export let getUInt64Buf = function (amount: number) {
  const buf = Buffer.alloc(8, 0);
  buf.writeBigUInt64LE(BigInt(amount));
  return buf;
};

export let getTxIdBuf = function (txid: string) {
  const buf = Buffer.from(txid, "hex").reverse();
  return buf;
};

export let getScriptHashBuf = function (scriptBuf: Buffer) {
  const buf = Buffer.from(bsv.crypto.Hash.sha256ripemd160(scriptBuf));
  return buf;
};

export let writeVarint = function (buf: Buffer) {
  const n = buf.length;
  let header: Buffer;
  let res = Buffer.alloc(0);
  if (n < 0xfd) {
    header = getUInt8Buf(n);
  } else if (n < 0x10000) {
    header = Buffer.concat([Buffer.from("fd", "hex"), getUInt16Buf(n)]);
  } else if (n < 0x100000000) {
    header = Buffer.concat([Buffer.from("fe", "hex"), getUInt32Buf(n)]);
  } else if (n < 0x10000000000000000) {
    header = Buffer.concat([Buffer.from("ff", "hex"), getUInt64Buf(n)]);
  }

  return Buffer.concat([header, buf]);
};
