"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNull = exports.getCodeHash = exports.getDustThreshold = exports.reverseEndian = exports.unlockP2PKHInput = exports.getRandomHex = exports.getRandomInt = exports.checkIfValidHexString = void 0;
require("./fix_bsv_in_scrypt");
const scryptlib_1 = require("scryptlib");
// Helper functions
function checkIfValidHexString(hexString) {
    if (typeof hexString !== "string")
        return false;
    let re = new RegExp("^(0x|0X)?[a-fA-F0-9]+$");
    return re.test(hexString);
}
exports.checkIfValidHexString = checkIfValidHexString;
// Test functions
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
exports.getRandomInt = getRandomInt;
// Random hex string generator
function getRandomHex(len) {
    let output = "";
    for (let i = 0; i < len; ++i) {
        output += Math.floor(Math.random() * 16).toString(16);
    }
    return output;
}
exports.getRandomHex = getRandomHex;
function unlockP2PKHInput(privateKey, tx, inputIndex, sigtype) {
    const sig = new scryptlib_1.bsv.Transaction.Signature({
        publicKey: privateKey.publicKey,
        prevTxId: tx.inputs[inputIndex].prevTxId,
        outputIndex: tx.inputs[inputIndex].outputIndex,
        inputIndex,
        signature: scryptlib_1.bsv.Transaction.Sighash.sign(tx, privateKey, sigtype, inputIndex, tx.inputs[inputIndex].output.script, tx.inputs[inputIndex].output.satoshisBN),
        sigtype,
    });
    tx.inputs[inputIndex].setScript(scryptlib_1.bsv.Script.buildPublicKeyHashIn(sig.publicKey, sig.signature.toDER(), sig.sigtype));
}
exports.unlockP2PKHInput = unlockP2PKHInput;
function reverseEndian(hexStr) {
    let num = new scryptlib_1.bsv.crypto.BN(hexStr, "hex");
    let buf = num.toBuffer();
    return buf.toString("hex").match(/.{2}/g).reverse().join("");
}
exports.reverseEndian = reverseEndian;
function getDustThreshold(lockingScriptSize) {
    return 3 * Math.ceil((250 * (lockingScriptSize + 9 + 148)) / 1000);
}
exports.getDustThreshold = getDustThreshold;
function getCodeHash(script) {
    let codePartChunks = [];
    for (let i = 0; i < script.chunks.length - 1; i++) {
        if (script.chunks[i].opcodenum == 106) {
            codePartChunks = script.chunks.slice(0, i);
            break;
        }
    }
    if (codePartChunks.length == 0)
        codePartChunks = script.chunks;
    let codePartScript = new scryptlib_1.bsv.Script();
    codePartScript.chunks = codePartChunks;
    return scryptlib_1.toHex(scryptlib_1.bsv.crypto.Hash.sha256ripemd160(codePartScript.toBuffer()));
}
exports.getCodeHash = getCodeHash;
function isNull(val) {
    if (typeof val == "undefined" || val == null || val == "undefined") {
        return true;
    }
    else {
        return false;
    }
}
exports.isNull = isNull;
