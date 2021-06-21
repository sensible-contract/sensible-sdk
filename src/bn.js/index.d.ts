// Type definitions for bn.js 5.1
// Project: https://github.com/indutny/bn.js
// Definitions by: Leonid Logvinov <https://github.com/LogvinovLeon>
//                 Henry Nguyen <https://github.com/HenryNguyen5>
//                 Gaylor Bosson <https://github.com/Gilthoniel>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node"/>

declare namespace BN {
  type Endianness = "le" | "be";
  type IPrimeName = "k256" | "p224" | "p192" | "p25519";

  interface MPrime {
    name: string;
    p: BN;
    n: number;
    k: BN;
  }

  interface ReductionContext {
    m: number;
    prime: MPrime;
    [key: string]: any;
  }
}

declare class BN {
  static BN: typeof BN;
  static wordSize: 26;
  static Zero: BN;
  static One: BN;
  static Minus1: BN;

  constructor(
    number: number | string | number[] | Uint8Array | Buffer | BN,
    base?: number | "hex",
    endian?: BN.Endianness
  );
  constructor(
    number: number | string | number[] | Uint8Array | Buffer | BN,
    endian?: BN.Endianness
  );

  /**
   * @description  create a reduction context
   */
  static red(reductionContext: BN | BN.IPrimeName): BN.ReductionContext;

  /**
   * @description  create a reduction context  with the Montgomery trick.
   */
  static mont(num: BN): BN.ReductionContext;

  /**
   * @description returns true if the supplied object is a BN.js instance
   */
  static isBN(b: any): b is BN;

  /**
   * @description returns the maximum of 2 BN instances.
   */
  static max(left: BN, right: BN): BN;

  /**
   * @description returns the minimum of 2 BN instances.
   */
  static min(left: BN, right: BN): BN;

  /**
   * @description  clone number
   */
  clone(): BN;

  /**
   * @description  convert to base-string and pad with zeroes
   */
  toString(base?: number | "hex", length?: number): string;

  /**
   * @description convert to JSON compatible hex string (alias of toString(16))
   */
  toJSON(): string;

  /**
   * @description  convert to byte Array, and optionally zero pad to length, throwing if already exceeding
   */
  toArray(endian?: BN.Endianness, length?: number): number[];

  /**
   * @description convert to an instance of `type`, which must behave like an Array
   */
  toArrayLike(
    ArrayType: typeof Buffer,
    endian?: BN.Endianness,
    length?: number
  ): Buffer;

  toArrayLike(ArrayType: any[], endian?: BN.Endianness, length?: number): any[];

  /**
   * @description get number of bits occupied
   */
  bitLength(): number;

  /**
   * @description return number of less-significant consequent zero bits (example: 1010000 has 4 zero bits)
   */
  zeroBits(): number;

  /**
   * @description return number of bytes occupied
   */
  byteLength(): number;

  /**
   * @description  true if the number is negative
   */
  isNeg(): boolean;

  /**
   * @description  check if value is even
   */
  isEven(): boolean;

  /**
   * @description   check if value is odd
   */
  isOdd(): boolean;

  /**
   * @description  check if value is zero
   */
  isZero(): boolean;

  /**
   * @description compare numbers and return `-1 (a < b)`, `0 (a == b)`, or `1 (a > b)` depending on the comparison result
   */
  cmp(b: BN): -1 | 0 | 1;

  /**
   * @description compare numbers and return `-1 (a < b)`, `0 (a == b)`, or `1 (a > b)` depending on the comparison result
   */
  ucmp(b: BN): -1 | 0 | 1;

  /**
   * @description compare numbers and return `-1 (a < b)`, `0 (a == b)`, or `1 (a > b)` depending on the comparison result
   */
  cmpn(b: number): -1 | 0 | 1;

  /**
   * @description a less than b
   */
  lt(b: BN): boolean;

  /**
   * @description a less than b
   */
  ltn(b: number): boolean;

  /**
   * @description a less than or equals b
   */
  lte(b: BN): boolean;

  /**
   * @description a less than or equals b
   */
  lten(b: number): boolean;

  /**
   * @description a greater than b
   */
  gt(b: BN): boolean;

  /**
   * @description a greater than b
   */
  gtn(b: number): boolean;

  /**
   * @description a greater than or equals b
   */
  gte(b: BN): boolean;

  /**
   * @description a greater than or equals b
   */
  gten(b: number): boolean;

  /**
   * @description a equals b
   */
  eq(b: BN): boolean;

  /**
   * @description a equals b
   */
  eqn(b: number): boolean;

  /**
   * @description convert to two's complement representation, where width is bit width
   */
  toTwos(width: number): BN;

  /**
   * @description  convert from two's complement representation, where width is the bit width
   */
  fromTwos(width: number): BN;

  /**
   * @description negate sign
   */
  neg(): BN;

  /**
   * @description negate sign
   */
  ineg(): BN;

  /**
   * @description absolute value
   */
  abs(): BN;

  /**
   * @description absolute value
   */
  iabs(): BN;

  /**
   * @description addition
   */
  add(b: BN): BN;

  /**
   * @description  addition
   */
  iadd(b: BN): BN;

  /**
   * @description addition
   */
  addn(b: number): BN;

  /**
   * @description addition
   */
  iaddn(b: number): BN;

  /**
   * @description subtraction
   */
  sub(b: BN): BN;

  /**
   * @description subtraction
   */
  isub(b: BN): BN;

  /**
   * @description subtraction
   */
  subn(b: number): BN;

  /**
   * @description subtraction
   */
  isubn(b: number): BN;

  /**
   * @description multiply
   */
  mul(b: BN): BN;

  /**
   * @description multiply
   */
  imul(b: BN): BN;

  /**
   * @description multiply
   */
  muln(b: number): BN;

  /**
   * @description multiply
   */
  imuln(b: number): BN;

  /**
   * @description square
   */
  sqr(): BN;

  /**
   * @description square
   */
  isqr(): BN;

  /**
   * @description raise `a` to the power of `b`
   */
  pow(b: BN): BN;

  /**
   * @description divide
   */
  div(b: BN): BN;

  /**
   * @description divide
   */
  divn(b: number): BN;

  /**
   * @description divide
   */
  idivn(b: number): BN;

  /**
   * @description reduct
   */
  mod(b: BN): BN;

  /**
   * @description reduct
   */
  umod(b: BN): BN;

  /**
   * @deprecated
   * @description reduct
   */
  modn(b: number): number;

  /**
   * @description reduct
   */
  modrn(b: number): number;

  /**
   * @description  rounded division
   */
  divRound(b: BN): BN;

  /**
   * @description or
   */
  or(b: BN): BN;

  /**
   * @description or
   */
  ior(b: BN): BN;

  /**
   * @description or
   */
  uor(b: BN): BN;

  /**
   * @description or
   */
  iuor(b: BN): BN;

  /**
   * @description and
   */
  and(b: BN): BN;

  /**
   * @description and
   */
  iand(b: BN): BN;

  /**
   * @description and
   */
  uand(b: BN): BN;

  /**
   * @description and
   */
  iuand(b: BN): BN;

  /**
   * @description and (NOTE: `andln` is going to be replaced with `andn` in future)
   */
  andln(b: number): BN;

  /**
   * @description xor
   */
  xor(b: BN): BN;

  /**
   * @description xor
   */
  ixor(b: BN): BN;

  /**
   * @description xor
   */
  uxor(b: BN): BN;

  /**
   * @description xor
   */
  iuxor(b: BN): BN;

  /**
   * @description set specified bit to 1
   */
  setn(b: number): BN;

  /**
   * @description shift left
   */
  shln(b: number): BN;

  /**
   * @description shift left
   */
  ishln(b: number): BN;

  /**
   * @description shift left
   */
  ushln(b: number): BN;

  /**
   * @description shift left
   */
  iushln(b: number): BN;

  /**
   * @description shift right
   */
  shrn(b: number): BN;

  /**
   * @description shift right (unimplemented https://github.com/indutny/bn.js/blob/master/lib/bn.js#L2086)
   */
  ishrn(b: number): BN;

  /**
   * @description shift right
   */
  ushrn(b: number): BN;
  /**
   * @description shift right
   */

  iushrn(b: number): BN;
  /**
   * @description  test if specified bit is set
   */

  testn(b: number): boolean;
  /**
   * @description clear bits with indexes higher or equal to `b`
   */

  maskn(b: number): BN;
  /**
   * @description clear bits with indexes higher or equal to `b`
   */

  imaskn(b: number): BN;
  /**
   * @description add `1 << b` to the number
   */
  bincn(b: number): BN;

  /**
   * @description not (for the width specified by `w`)
   */
  notn(w: number): BN;

  /**
   * @description not (for the width specified by `w`)
   */
  inotn(w: number): BN;

  /**
   * @description GCD
   */
  gcd(b: BN): BN;

  /**
   * @description Extended GCD results `({ a: ..., b: ..., gcd: ... })`
   */
  egcd(b: BN): { a: BN; b: BN; gcd: BN };

  /**
   * @description inverse `a` modulo `b`
   */
  invm(b: BN): BN;

  /**
   * @description Convert number to red
   */
  toRed(reductionContext: BN.ReductionContext): RedBN;

  /**
   * Convert a number into a big number.
   *
   * @param {number} n Any positive or negative integer.
   */
  static fromNumber(n: number): BN;

  /**
   * Convert a string number into a big number.
   *
   * @param {string} str Any positive or negative integer formatted as a string.
   * @param {number} base The base of the number, defaults to 10.
   */
  static fromString(str: string, base: number): BN;

  /**
   * Convert a buffer (such as a 256 bit binary private key) into a big number.
   * Sometimes these numbers can be formatted either as 'big endian' or 'little
   * endian', and so there is an opts parameter that lets you specify which
   * endianness is specified.
   *
   * @param {Buffer} buf A buffer number, such as a 256 bit hash or key.
   * @param {Object} opts With a property 'endian' that can be either 'big' or 'little'. Defaults big endian (most significant digit first).
   */
  static fromBuffer(buf, opts): BN;

  /**
   * Instantiate a BigNumber from a "signed magnitude buffer". (a buffer where the
   * most significant bit represents the sign (0 = positive, 1 = negative)
   *
   * @param {Buffer} buf A buffer number, such as a 256 bit hash or key.
   * @param {Object} opts With a property 'endian' that can be either 'big' or 'little'. Defaults big endian (most significant digit first).
   */
  static fromSM(buf: Buffer, opts: any): BN;

  /**
   * Convert a big number into a number.
   */
  toNumber(): number;

  /**
   * Convert a big number into a buffer. This is somewhat ambiguous, so there is
   * an opts parameter that let's you specify the endianness or the size.
   * opts.endian can be either 'big' or 'little' and opts.size can be any
   * sufficiently large number of bytes. If you always want to create a 32 byte
   * big endian number, then specify opts = { endian: 'big', size: 32 }
   *
   * @param {Object} opts Defaults to { endian: 'big', size: 32 }
   */
  toBuffer(opts?: any): Buffer;

  /**
   * For big numbers that are either positive or negative, you can convert to
   * "sign magnitude" format whereby the first bit specifies whether the number is
   * positive or negative.
   */
  toSMBigEndian(): BN;

  /**
   * For big numbers that are either positive or negative, you can convert to
   * "sign magnitude" format whereby the first bit specifies whether the number is
   * positive or negative.
   *
   * @param {Object} opts Defaults to { endian: 'big' }
   */
  toSM(opts: any): Buffer;

  /**
   * Create a BN from a "ScriptNum": This is analogous to the constructor for
   * CScriptNum in bitcoind. Many ops in bitcoind's script interpreter use
   * CScriptNum, which is not really a proper bignum. Instead, an error is thrown
   * if trying to input a number bigger than 4 bytes. We copy that behavior here.
   * A third argument, `size`, is provided to extend the hard limit of 4 bytes, as
   * some usages require more than 4 bytes.
   *
   * @param {Buffer} buf A buffer of a number.
   * @param {boolean} fRequireMinimal Whether to require minimal size encoding.
   * @param {number} size The maximum size.
   */
  fromScriptNumBuffer(buf: Buffer, fRequireMinimal: boolean, size: number): BN;

  /**
   * The corollary to the above, with the notable exception that we do not throw
   * an error if the output is larger than four bytes. (Which can happen if
   * performing a numerical operation that results in an overflow to more than 4
   * bytes).
   */
  toScriptNumBuffer(): Buffer;

  /**
   * Trims a buffer if it starts with zeros.
   *
   * @param {Buffer} buf A buffer formatted number.
   * @param {number} natlen The natural length of the number.
   */
  static trim(buf: Buffer, natlen: number): Buffer;

  /**
   * Adds extra zeros to the start of a number.
   *
   * @param {Buffer} buf A buffer formatted number.
   * @param {number} natlen The natural length of the number.
   * @param {number} size How big to pad the number in bytes.
   */
  static pad(buf: Buffer, natlen: number, size: number): Buffer;

  /**
   * Convert a big number into a hex string. This is somewhat ambiguous, so there
   * is an opts parameter that let's you specify the endianness or the size.
   * opts.endian can be either 'big' or 'little' and opts.size can be any
   * sufficiently large number of bytes. If you always want to create a 32 byte
   * big endian number, then specify opts = { endian: 'big', size: 32 }
   *
   * @param {Object} opts Defaults to { endian: 'big', size: 32 }
   */
  toHex(...args): string;

  /**
   * Convert a hex string (such as a 256 bit binary private key) into a big
   * number. Sometimes these numbers can be formatted either as 'big endian' or
   * 'little endian', and so there is an opts parameter that lets you specify
   * which endianness is specified.
   *
   * @param {Buffer} buf A buffer number, such as a 256 bit hash or key.
   * @param {Object} opts With a property 'endian' that can be either 'big' or 'little'. Defaults big endian (most significant digit first).
   */
  fromHex(hex: string, ...args): BN;
}

/**
 * Big-Number class with additionnal methods that are using modular
 * operation.
 */
declare class RedBN extends BN {
  /**
   * @description Convert back a number using a reduction context
   */
  fromRed(): BN;

  /**
   * @description modular addition
   */
  redAdd(b: BN): RedBN;

  /**
   * @description in-place modular addition
   */
  redIAdd(b: BN): RedBN;

  /**
   * @description modular subtraction
   */
  redSub(b: BN): RedBN;

  /**
   * @description in-place modular subtraction
   */
  redISub(b: BN): RedBN;

  /**
   * @description modular shift left
   */
  redShl(num: number): RedBN;

  /**
   * @description modular multiplication
   */
  redMul(b: BN): RedBN;

  /**
   * @description in-place modular multiplication
   */
  redIMul(b: BN): RedBN;

  /**
   * @description modular square
   */
  redSqr(): RedBN;

  /**
   * @description in-place modular square
   */
  redISqr(): RedBN;

  /**
   * @description modular square root
   */
  redSqrt(): RedBN;

  /**
   * @description modular inverse of the number
   */
  redInvm(): RedBN;

  /**
   * @description modular negation
   */
  redNeg(): RedBN;

  /**
   * @description modular exponentiation
   */
  redPow(b: BN): RedBN;
}

export = BN;
