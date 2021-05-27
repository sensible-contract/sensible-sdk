require("./fix_bsv_in_scrypt");
import { bsv, toHex } from "scryptlib";
// Helper functions
export function checkIfValidHexString(hexString: string): boolean {
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
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random hex string generator
export function getRandomHex(len: number) {
  let output = "";
  for (let i = 0; i < len; ++i) {
    output += Math.floor(Math.random() * 16).toString(16);
  }
  return output;
}

export function unlockP2PKHInput(privateKey, tx, inputIndex, sigtype) {
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

export function reverseEndian(hexStr: string): string {
  let num = new bsv.crypto.BN(hexStr, "hex");
  let buf = num.toBuffer();
  return buf.toString("hex").match(/.{2}/g).reverse().join("");
}

export function getDustThreshold(lockingScriptSize: number) {
  return 3 * Math.ceil((250 * (lockingScriptSize + 9 + 148)) / 1000);
}

export function getCodeHash(script) {
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

export function isNull(val: any) {
  if (typeof val == "undefined" || val == null || val == "undefined") {
    return true;
  } else {
    return false;
  }
}
export type SigHashInfo = {
  sighash: string;
  sighashType: number;
  address: string;
  inputIndex: number;
  isP2PKH: boolean;
};

export type SigInfo = {
  sig: any;
  publicKey: any;
};
export const SIG_PLACE_HOLDER =
  "41682c2074686973206973206120706c61636520686f6c64657220616e642077696c6c206265207265706c6163656420696e207468652066696e616c207369676e61747572652e00";
export const P2PKH_UNLOCK_SIZE = 1 + 1 + 72 + 1 + 33;

export function numberToBuffer(n: number) {
  let str = n.toString(16);
  if (str.length % 2 == 1) {
    str = "0" + str;
  }
  return Buffer.from(str, "hex");
}

export function sign(tx: any, sigHashList: SigHashInfo[], sigList: SigInfo[]) {
  sigHashList.forEach(({ inputIndex, isP2PKH, sighashType }, index) => {
    let input = tx.inputs[inputIndex];
    let { publicKey, sig } = sigList[index];
    if (isP2PKH) {
      const signature = new bsv.Transaction.Signature({
        publicKey,
        prevTxId: input.prevTxId,
        outputIndex: input.outputIndex,
        inputIndex: inputIndex,
        signature: sig,
        sigtype: sighashType,
      });
      input.setScript(
        bsv.Script.buildPublicKeyHashIn(
          signature.publicKey,
          signature.signature.toDER(),
          signature.sigtype
        )
      );
    } else {
      let _sig = sig.toTxFormat();
      let oldSigHex = Buffer.concat([
        Buffer.from("47", "hex"),
        Buffer.from(SIG_PLACE_HOLDER, "hex"),
      ]).toString("hex");

      let newSigHex = Buffer.concat([
        numberToBuffer(_sig.length),
        _sig,
      ]).toString("hex");
      input.setScript(input.script.toHex().replace(oldSigHex, newSigHex));
    }
  });
}

function satoshisToBSV(satoshis) {
  return (satoshis / 100000000).toFixed(8);
}
export function dumpTx(tx, network = "mainnet") {
  const version = tx.version;
  const size = tx.toBuffer().length;
  const feePaid = tx._getUnspentValue();
  const feeRate = (feePaid / size).toFixed(4);

  console.log(`
=============================================================================================
Summary
  txid:     ${tx.id}
  Size:     ${size}
  Fee Paid: ${satoshisToBSV(feePaid)}
  Fee Rate: ${feeRate} sat/B
  Detail:   ${tx.inputs.length} Inputs, ${tx.outputs.length} Outputs
----------------------------------------------------------------------------------------------
${tx.inputs
  .map((input, index) => {
    let type = "";
    if (input.output.script.isPublicKeyHashOut()) {
      type = "standard";
    } else if (input.output.script.isSafeDataOut()) {
      type = "OP_RETURN";
    } else {
      type = "nonstandard";
    }
    let str = `
=>${index}    ${
      type == "standard"
        ? input.output.script.toAddress(network).toString()
        : type == "OP_RETURN"
        ? "OP_RETURN" + " ".repeat(34 - 9)
        : "nonstandard" + " ".repeat(34 - 11)
    }    ${satoshisToBSV(input.output.satoshis)} BSV
       lock-size:   ${input.output.script.toBuffer().length}
       unlock-size: ${input.script.toBuffer().length}
       via ${input.prevTxId.toString("hex")} [${input.outputIndex}]
`;
    return str;
  })
  .join("")}
Input total: ${satoshisToBSV(
    tx.inputs.reduce((pre, cur) => pre + cur.output.satoshis, 0)
  )} BSV
----------------------------------------------------------------------------------------------
${tx.outputs
  .map((output, index) => {
    let type = "";
    if (output.script.isPublicKeyHashOut()) {
      type = "standard";
    } else if (output.script.isSafeDataOut()) {
      type = "OP_RETURN";
    } else {
      type = "nonstandard";
    }
    let str = `
=>${index}    ${
      type == "standard"
        ? output.script.toAddress(network).toString()
        : type == "OP_RETURN"
        ? "OP_RETURN" + " ".repeat(34 - 9)
        : "nonstandard" + " ".repeat(34 - 11)
    }    ${satoshisToBSV(output.satoshis)} BSV
       size: ${output.script.toBuffer().length}
		`;
    return str;
  })
  .join("")}
Output total: ${satoshisToBSV(
    tx.outputs.reduce((pre, cur) => pre + cur.satoshis, 0)
  )} BSV
=============================================================================================
	 `);
}
