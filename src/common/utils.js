require("./fix_bsv_in_scrypt");
const { compile, bsv, Sha256, toHex } = require("scryptlib");
// Helper functions
function checkIfValidHexString(hexString) {
  if (typeof hexString !== "string") return false;
  let re = new RegExp("^(0x|0X)?[a-fA-F0-9]+$");
  return re.test(hexString);
}

function decimalToHexString(number) {
  if (typeof number !== "bigint" && isNaN(number))
    throw ("Error: Argument %s should be a Number or BigInt", number);

  if (number < 0) {
    number = 0xffffffff + number + 1;
  }
  return "0x" + number.toString(16);
}

function hexStringToDecimal(hexString) {
  if (!checkIfValidHexString(hexString))
    throw (
      ("Error: Hex %s should be hexadecimal with or without '0x' at the beginning.",
      hexString)
    );
  // Remove 0x from string if necessary
  hexString = hexString.replace("0x", "");

  var i,
    j,
    digits = [0],
    carry;
  for (i = 0; i < hexString.length; i += 1) {
    carry = parseInt(hexString.charAt(i), 16);
    for (j = 0; j < digits.length; j += 1) {
      digits[j] = digits[j] * 16 + carry;
      carry = (digits[j] / 10) | 0;
      digits[j] %= 10;
    }
    while (carry > 0) {
      digits.push(carry % 10);
      carry = (carry / 10) | 0;
    }
  }
  return digits.reverse().join("");
}

function hexStringToBigInt(hexString) {
  return BigInt(hexStringToDecimal(hexString));
}
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

// Random hex string generator
function getRandomHex(len) {
  let output = "";
  for (let i = 0; i < len; ++i) {
    output += Math.floor(Math.random() * 16).toString(16);
  }
  return output;
}

function unlockP2PKHInput(privateKey, tx, inputIndex, sigtype) {
  const sig = new bsv.Transaction.Signature({
    publicKey: privateKey.publicKey,
    prevTxId: tx.inputs[inputIndex].prevTxId,
    outputIndex: tx.inputs[inputIndex].outputIndex,
    inputIndex,
    signature: bsv.Transaction.Sighash.sign(
      tx,
      privateKey,
      sigtype,
      inputIndex,
      tx.inputs[inputIndex].output.script,
      tx.inputs[inputIndex].output.satoshisBN
    ),
    sigtype,
  });

  tx.inputs[inputIndex].setScript(
    bsv.Script.buildPublicKeyHashIn(
      sig.publicKey,
      sig.signature.toDER(),
      sig.sigtype
    )
  );
}

function reverseEndian(hexStr) {
  let num = new bsv.crypto.BN(hexStr, "hex");
  let buf = num.toBuffer();
  return buf.toString("hex").match(/.{2}/g).reverse().join("");
}

function getDustThreshold(lockingScriptSize) {
  return 3 * Math.ceil((250 * (lockingScriptSize + 9 + 148)) / 1000);
}

function getCodeHash(script) {
  let codePartChunks = [];
  for (let i = 0; i < script.chunks.length - 1; i++) {
    if (script.chunks[i].opcodenum == 106) {
      codePartChunks = script.chunks.slice(0, i);
      break;
    }
  }
  if (codePartChunks.length == 0) codePartChunks = script.chunks;
  let codePartScript = new bsv.Script();
  codePartScript.chunks = codePartChunks;
  return toHex(bsv.crypto.Hash.sha256ripemd160(codePartScript.toBuffer()));
}

function isNull(val) {
  if (typeof val == "undefined" || val == null || val == "undefined") {
    return true;
  } else {
    return false;
  }
}
module.exports = {
  checkIfValidHexString,
  decimalToHexString,
  hexStringToDecimal,
  hexStringToBigInt,
  getRandomInt,
  getRandomHex,
  unlockP2PKHInput,
  reverseEndian,
  getDustThreshold,
  getCodeHash,
  isNull,
};
