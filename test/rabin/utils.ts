import BN = require("../bn.js");

// Helper functions
export function checkIfValidHexString(hexString: string) {
  if (typeof hexString !== "string") return false;
  let re = new RegExp("^(0x|0X)?[a-fA-F0-9]+$");
  return re.test(hexString);
}

// Test functions
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random hex string generator
export function getRandomHex(len) {
  let output = "";
  for (let i = 0; i < len; ++i) {
    output += Math.floor(Math.random() * 16).toString(16);
  }
  return output;
}

function sign(value: BN) {
  if (value.gt(BN.Zero)) {
    return BN.One;
  }
  if (value.lt(BN.Zero)) {
    return BN.Minus1;
  }
  return BN.Zero;
}

export function bigIntAbsoluteValue(value: BN) {
  if (sign(value).eq(BN.Minus1)) {
    return value.mul(BN.Minus1);
  } else return value;
}
