import * as bsv from "../bsv";
import BN = require("../bn.js");

export const RABIN_SIG_LEN = 384;

export let toBufferLE = function (num: number | string, width: number) {
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
  return new BN(amount.toString()).toBuffer({ endian: "little", size: 8 });
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

export let getLockingScriptFromPreimage = function (buf: Buffer) {
  const offset = 4 + 32 + 32 + 32 + 4;
  buf = buf.slice(offset, buf.length);
  const n = buf[0];
  buf = buf.slice(1, buf.length);
  let lockingScriptBuf;
  if (n < 0xfd) {
    let len = buf.slice(0, 1).readInt8(0);
    lockingScriptBuf = buf.slice(1, len + 1);
  } else if (n < 0x10000) {
    let len = buf.slice(0, 2).readInt16LE(0);
    lockingScriptBuf = buf.slice(2, len + 2);
  } else if (n < 0x100000000) {
    let len = buf.slice(0, 3).readInt32LE(0);
    lockingScriptBuf = buf.slice(3, len + 3);
  } else if (n < 0x10000000000000000) {
    let len = buf.slice(0, 4).readInt32LE(0);
    lockingScriptBuf = buf.slice(4, len + 4);
  }
  return lockingScriptBuf;
};

export let getGenesisHashFromLockingScript = function (
  lockingScript: any
): Buffer {
  let genesisHash: Buffer;
  let c = 0;
  for (let i = 0; i < lockingScript.chunks.length; i++) {
    let chunk = lockingScript.chunks[i];
    if (chunk.buf && chunk.buf.length == 20) {
      c++;
      if (c == 11) {
        genesisHash = chunk.buf;
        break;
      }
    }
  }
  return genesisHash;
};
