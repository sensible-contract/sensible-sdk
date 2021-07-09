import * as BN from "../../src/bn.js";
/*  
A Rabin Signature JavaScript module adapted
from: https://github.com/scrypt-sv/rabin/blob/master/rabin.py
*/
const crypto = require("crypto");

function greatestCommonDivisor(a: BN, b: BN) {
  if (a.lt(BN.Zero)) a = a.mul(BN.Minus1);
  if (b.lt(BN.Zero)) b = b.mul(BN.Minus1);
  if (b.gt(a)) {
    let t = a;
    a = b;
    b = t;
  }
  while (b.gt(BN.Zero)) {
    let t = b;
    b = a.mod(b);
    a = t;
  }
  return a;
}

// Calculates: base^exponent % modulus
function powerMod(base: BN, exponent: BN, modulus: BN) {
  if (modulus.eq(BN.One)) return BN.Zero;
  let result = BN.One;
  base = base.mod(modulus);
  while (exponent.gt(BN.Zero)) {
    if (exponent.mod(BN.fromNumber(2)).eq(BN.One))
      //odd number
      result = result.mul(base).mod(modulus);
    exponent = exponent.div(BN.fromNumber(2)); //divide by 2
    base = base.mul(base).mod(modulus);
  }
  return result;
}

function rabinHashBytes(bytes: Buffer): BN {
  let hBytes = crypto.createHash("sha256").update(bytes).digest();
  for (let i = 0; i < 11; i++) {
    hBytes = Buffer.concat([
      hBytes,
      crypto.createHash("sha256").update(hBytes).digest(),
    ]);
  }

  return BN.fromBuffer(hBytes, { endian: "little" });
}

function calculateNextPrime(p: BN) {
  let numArr = [3, 5, 7, 11, 13, 17, 19, 23, 29];
  let smallPrimesProduct = numArr.reduce(
    (pre, cur) => BN.fromNumber(cur).mul(pre),
    BN.One
  );
  while (greatestCommonDivisor(p, smallPrimesProduct).eq(BN.One) == false) {
    p = p.add(BN.fromNumber(4));
  }
  if (powerMod(BN.fromNumber(2), p.sub(BN.One), p).eq(BN.One) == false) {
    return calculateNextPrime(p.add(BN.fromNumber(4)));
  }
  if (powerMod(BN.fromNumber(3), p.sub(BN.One), p).eq(BN.One) == false) {
    return calculateNextPrime(p.add(BN.fromNumber(4)));
  }
  if (powerMod(BN.fromNumber(5), p.sub(BN.One), p).eq(BN.One) == false) {
    return calculateNextPrime(p.add(BN.fromNumber(4)));
  }
  if (powerMod(BN.fromNumber(17), p.sub(BN.One), p).eq(BN.One) == false) {
    return calculateNextPrime(p.add(BN.fromNumber(4)));
  }
  return p;
}

function getPrimeNumber(p: BN) {
  while (p.mod(BN.fromNumber(4)).eq(BN.fromNumber(3)) == false) {
    p = p.add(BN.One);
  }
  return calculateNextPrime(p);
}
function root(dataBuffer: Buffer, p: BN, q: BN, nRabin: BN) {
  let sig: BN, x: BN;
  let padding = Buffer.alloc(2);
  let i = 0;
  while (true) {
    x = rabinHashBytes(Buffer.concat([dataBuffer, padding])).mod(nRabin);
    sig = powerMod(p, q.sub(BN.fromNumber(2)), q)
      .mul(p)
      .mul(powerMod(x, q.add(BN.One).div(BN.fromNumber(4)), q));
    sig = powerMod(q, p.sub(BN.fromNumber(2)), p)
      .mul(q)
      .mul(powerMod(x, p.add(BN.One).div(BN.fromNumber(4)), p))
      .add(sig)
      .mod(nRabin);
    if (sig.mul(sig).mod(nRabin).eq(x)) {
      break;
    }
    i++;
    padding.writeInt8(i);
  }
  return {
    signature: sig,
    padding: padding.toString("hex"),
  };
}

/**
 * Calculates Key nRabin (public key) from private key parts p & q
 * @param {BigInt} p Key private key 'p' part
 * @param {BigInt} q Key private key 'q' part
 * @returns {BigInt} Key nRabin (public key) = p * q
 */
export function privKeyToPubKey(p: BN, q: BN): BN {
  return p.mul(q);
}

/**
 * Generates Private Key p & q parts from a PRNG seed
 * @returns {JSON} {'p': BigInt,'q': BigInt}
 */
export function generatePrivKey() {
  // Get a seed value from a random buffer and convert it to a BigInt
  let seed = crypto.randomBytes(2048);
  return generatePrivKeyFromSeed(seed);
}

/**
 * Generates Private Key p & q parts from Seed
 * @param {Buffer} seed
 * @returns {JSON} {'p': BigInt,'q': BigInt}
 */
export function generatePrivKeyFromSeed(seed: string) {
  let p: BN = getPrimeNumber(
    rabinHashBytes(Buffer.from(seed, "hex")).mod(
      BN.fromNumber(2).pow(BN.fromNumber(501)).add(BN.One)
    )
  );
  let q: BN = getPrimeNumber(
    rabinHashBytes(Buffer.from(seed + "00", "hex")).mod(
      BN.fromNumber(2).pow(BN.fromNumber(501)).add(BN.One)
    )
  );
  return {
    p: p,
    q: q,
  };
}

/**
 * Creates a Rabin signature of hexadecimal data with a given key's values
 * @param {String} dataHex Hexadecimal data string value
 * @param {BigInt} p Key 'p' value
 * @param {BigInt} q Key 'q' value
 * @param {BigInt} nRabin Key nRabin value
 * @returns {JSON} {"signature": BigInt, "paddingByteCount": Number} Signature and padding count
 */
export function sign(dataHex: string, p: BN, q: BN, nRabin: BN) {
  // Remove 0x from data if necessary
  dataHex = dataHex.replace("0x", "");
  return root(Buffer.from(dataHex, "hex"), p, q, nRabin);
}

/**
 * Verifies a Rabin signature of hexadecimal data with given padding count, signature and key nRabin value
 * @param {String} dataHex Hexadecimal data string value
 * @param {Number} paddingByteCount Padding byte count
 * @param {BigInt} signature Rabin signature value
 * @param {BigInt} nRabin Public Key nRabin value
 * @returns {Boolean} If signature is valid or not
 */
export function verify(
  dataHex: string,
  padding: string,
  signature: BN,
  nRabin: BN
) {
  // Remove 0x from data if necessary
  dataHex = dataHex.replace("0x", "");

  let dataBuffer = Buffer.from(dataHex, "hex");
  let paddingBuffer = Buffer.from(padding, "hex");
  let paddedDataBuffer = Buffer.concat([dataBuffer, paddingBuffer]);
  let dataHash = rabinHashBytes(paddedDataBuffer);
  let hashMod = dataHash.mod(nRabin);
  return hashMod.eq(signature.pow(BN.fromNumber(2)).mod(nRabin));
}
