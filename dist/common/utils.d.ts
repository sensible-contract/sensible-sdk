export declare function checkIfValidHexString(hexString: string): boolean;
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export declare function getRandomInt(min: number, max: number): number;
export declare function getRandomHex(len: number): string;
export declare function unlockP2PKHInput(privateKey: any, tx: any, inputIndex: any, sigtype: any): void;
export declare function reverseEndian(hexStr: string): string;
export declare function getDustThreshold(lockingScriptSize: number): number;
export declare function getCodeHash(script: any): string;
export declare function isNull(val: any): boolean;
