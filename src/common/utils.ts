import { toHex } from "scryptlib";
import * as bsv from "../bsv";
import * as TokenUtil from "./tokenUtil";

export function getDustThreshold(lockingScriptSize: number) {
  return 3 * Math.ceil((250 * (lockingScriptSize + 9 + 148)) / 1000);
}

export function isNull(val: any) {
  if (typeof val == "undefined" || val == null || val == "undefined") {
    return true;
  } else {
    return false;
  }
}

export function getVarPushdataHeader(n: number): Buffer {
  let header = "";
  if (n == 0) {
  } else if (n == 1) {
    //不处理这种情况，这里只考虑长脚本
  } else if (n < 76) {
    // Use direct push
    header = toHex(TokenUtil.getUInt8Buf(n));
  } else if (n <= 255) {
    header = "4c" + toHex(TokenUtil.getUInt8Buf(n));
  } else if (n <= 65535) {
    header = "4d" + toHex(TokenUtil.getUInt16Buf(n));
  } else {
    header = "4e" + toHex(TokenUtil.getUInt32Buf(n));
  }
  return Buffer.from(header, "hex");
}

export enum CONTRACT_TYPE {
  P2PKH,
  BCP01_NFT,
  BCP01_NFT_GENESIS,
  BCP01_NFT_UNLOCK_CONTRACT_CHECK,
  BCP02_TOKEN,
  BCP02_TOKEN_GENESIS,
  BCP02_TOKEN_TRANSFER_CHECK,
  BCP02_TOKEN_UNLOCK_CONTRACT_CHECK,
  OTHER,
}
export type SigHashInfo = {
  sighash: string;
  sighashType: number;
  address: string;
  inputIndex: number;
  contractType: CONTRACT_TYPE;
};

export type SigInfo = {
  sig: string;
  publicKey: any;
};
export const PLACE_HOLDER_SIG =
  "41682c2074686973206973206120706c61636520686f6c64657220616e642077696c6c206265207265706c6163656420696e207468652066696e616c207369676e61747572652e00";
export const PLACE_HOLDER_PUBKEY =
  "41682c2074686973206973206120706c61636520686f6c64657220616e64207769";
export const P2PKH_UNLOCK_SIZE = 1 + 1 + 72 + 1 + 33;

export function numberToBuffer(n: number) {
  let str = n.toString(16);
  if (str.length % 2 == 1) {
    str = "0" + str;
  }
  return Buffer.from(str, "hex");
}

export function sign(
  tx: bsv.Transaction,
  sigHashList: SigHashInfo[],
  sigList: SigInfo[]
) {
  sigHashList.forEach(({ inputIndex, contractType, sighashType }, index) => {
    let input = tx.inputs[inputIndex];
    let { publicKey, sig } = sigList[index];
    publicKey = new bsv.PublicKey(publicKey);
    let _sig = bsv.crypto.Signature.fromString(sig);
    _sig.nhashtype = sighashType;
    if (contractType == CONTRACT_TYPE.P2PKH) {
      const signature = new bsv.Transaction.Signature({
        publicKey,
        prevTxId: input.prevTxId,
        outputIndex: input.outputIndex,
        inputIndex: inputIndex,
        signature: _sig,
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
      let _sig2 = _sig.toTxFormat();
      let oldSigHex = Buffer.concat([
        numberToBuffer(PLACE_HOLDER_SIG.length / 2),
        Buffer.from(PLACE_HOLDER_SIG, "hex"),
      ]).toString("hex");

      let newSigHex = Buffer.concat([
        numberToBuffer(_sig2.length),
        _sig2,
      ]).toString("hex");

      let oldPubKeyHex = Buffer.concat([
        numberToBuffer(PLACE_HOLDER_PUBKEY.length / 2),
        Buffer.from(PLACE_HOLDER_PUBKEY, "hex"),
      ]).toString("hex");

      const pubkeyBuffer = publicKey.toBuffer();
      let newPubKeyHex = Buffer.concat([
        numberToBuffer(pubkeyBuffer.length),
        pubkeyBuffer,
      ]).toString("hex");

      input.setScript(
        new bsv.Script(
          input.script
            .toHex()
            .replace(oldSigHex, newSigHex)
            .replace(oldPubKeyHex, newPubKeyHex)
        )
      );
    }
  });
}

function satoshisToBSV(satoshis) {
  return (satoshis / 100000000).toFixed(8);
}
export function dumpTx(tx: bsv.Transaction, network = "mainnet") {
  const version = tx.version;
  const size = tx.toBuffer().length;
  const inputAmount = tx.inputs.reduce(
    (pre, cur) => cur.output.satoshis + pre,
    0
  );
  const outputAmount = tx.outputs.reduce((pre, cur) => cur.satoshis + pre, 0);
  let feePaid = inputAmount - outputAmount;

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
