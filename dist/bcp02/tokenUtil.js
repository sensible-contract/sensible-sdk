"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeVarint = exports.getScriptHashBuf = exports.getTxIdBuf = exports.getUInt64Buf = exports.getUInt32Buf = exports.getUInt16Buf = exports.getUInt8Buf = exports.toBufferLE = exports.RABIN_SIG_LEN = void 0;
const scryptlib_1 = require("scryptlib");
exports.RABIN_SIG_LEN = 128;
let toBufferLE = function (num, width) {
    const hex = num.toString(16);
    const buffer = Buffer.from(hex.padStart(width * 2, "0").slice(0, width * 2), "hex");
    buffer.reverse();
    return buffer;
};
exports.toBufferLE = toBufferLE;
let getUInt8Buf = function (amount) {
    const buf = Buffer.alloc(1, 0);
    buf.writeUInt8(amount);
    return buf;
};
exports.getUInt8Buf = getUInt8Buf;
let getUInt16Buf = function (amount) {
    const buf = Buffer.alloc(2, 0);
    buf.writeUInt16LE(amount);
    return buf;
};
exports.getUInt16Buf = getUInt16Buf;
let getUInt32Buf = function (index) {
    const buf = Buffer.alloc(4, 0);
    buf.writeUInt32LE(index);
    return buf;
};
exports.getUInt32Buf = getUInt32Buf;
let getUInt64Buf = function (amount) {
    const buf = Buffer.alloc(8, 0);
    buf.writeBigUInt64LE(BigInt(amount));
    return buf;
};
exports.getUInt64Buf = getUInt64Buf;
let getTxIdBuf = function (txid) {
    const buf = Buffer.from(txid, "hex").reverse();
    return buf;
};
exports.getTxIdBuf = getTxIdBuf;
let getScriptHashBuf = function (scriptBuf) {
    const buf = Buffer.from(scryptlib_1.bsv.crypto.Hash.sha256ripemd160(scriptBuf));
    return buf;
};
exports.getScriptHashBuf = getScriptHashBuf;
let writeVarint = function (buf) {
    const n = buf.length;
    let header;
    let res = Buffer.alloc(0);
    if (n < 0xfd) {
        header = exports.getUInt8Buf(n);
    }
    else if (n < 0x10000) {
        header = Buffer.concat([Buffer.from("fd", "hex"), exports.getUInt16Buf(n)]);
    }
    else if (n < 0x100000000) {
        header = Buffer.concat([Buffer.from("fe", "hex"), exports.getUInt32Buf(n)]);
    }
    else if (n < 0x10000000000000000) {
        header = Buffer.concat([Buffer.from("ff", "hex"), exports.getUInt64Buf(n)]);
    }
    return Buffer.concat([header, buf]);
};
exports.writeVarint = writeVarint;
