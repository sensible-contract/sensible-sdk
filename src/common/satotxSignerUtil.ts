import * as BN from "../bn.js";
import { Bytes, Int, toHex } from "../scryptlib";
import { CodeError, ErrCode } from "./error";
import { SatotxSigner, SignerConfig } from "./SatotxSigner";
import * as TokenUtil from "./tokenUtil";

export async function getRabinDataEmpty(
  signers: SatotxSigner[],
  signerSelecteds: number[]
) {
  let rabinMsg: Bytes;
  let rabinPaddingArray: Bytes[] = [];
  let rabinSigArray: Int[] = [];
  rabinMsg = new Bytes("");
  signerSelecteds.forEach((v) => {
    rabinPaddingArray.push(new Bytes(""));
    rabinSigArray.push(new Int(0));
  });
  let rabinPubKeyIndexArray: number[] = signerSelecteds;
  let rabinPubKeyVerifyArray: Int[] = [];
  rabinPubKeyIndexArray.forEach((signerIndex) => {
    rabinPubKeyVerifyArray.push(
      new Int(signers[signerIndex].satotxPubKey.toString(10))
    );
  });
  return {
    rabinData: {
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
    },
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
  };
}
export async function getRabinData(
  signers: SatotxSigner[],
  signerSelecteds: number[],
  rabinUtxo?: {
    preTxId?: string;
    preOutputIndex?: number;
    preTxHex?: string;
    txId?: string;
    txHex?: string;
  }
) {
  let rabinMsg: Bytes;
  let rabinPaddingArray: Bytes[] = [];
  let rabinSigArray: Int[] = [];

  let rabinPubKeyIndexArray: number[] = signerSelecteds;
  let rabinPubKeyVerifyArray: Int[] = [];
  if (!rabinUtxo) {
    rabinMsg = new Bytes("");
    for (let i = 0; i < rabinPubKeyIndexArray.length; i++) {
      rabinPaddingArray.push(new Bytes(""));
      rabinSigArray.push(new Int(0));
    }
  } else {
    let sigReqArray = [];
    rabinPubKeyIndexArray.forEach((signerIndex) => {
      sigReqArray.push(
        signers[signerIndex].satoTxSigUTXOSpendBy({
          txId: rabinUtxo.preTxId,
          index: rabinUtxo.preOutputIndex,
          txHex: rabinUtxo.preTxHex,
          byTxId: rabinUtxo.txId,
          byTxHex: rabinUtxo.txHex,
        })
      );
    });
    for (let j = 0; j < sigReqArray.length; j++) {
      let sigInfo = await sigReqArray[j];
      if (j == 0) {
        rabinMsg = new Bytes(sigInfo.payload);
      }
      rabinSigArray.push(
        new Int(BN.fromString(sigInfo.sigBE, 16).toString(10))
      );
      rabinPaddingArray.push(new Bytes(sigInfo.padding));
    }
  }

  rabinPubKeyIndexArray.forEach((signerIndex) => {
    rabinPubKeyVerifyArray.push(
      new Int(signers[signerIndex].satotxPubKey.toString(10))
    );
  });

  return {
    rabinData: {
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
    },
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
  };
}

export async function getRabinDatas(
  signers: SatotxSigner[],
  signerSelecteds: number[],
  rabinInputs?: {
    preTxId?: string;
    preOutputIndex?: number;
    preTxHex?: string;
    txId?: string;
    outputIndex?: number;
    txHex?: string;
  }[]
) {
  let rabinDatas: {
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
  }[] = [];

  let checkRabinData: {
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
  } = {
    rabinMsg: new Bytes(""),
    rabinPaddingArray: [],
    rabinSigArray: [],
  };
  let checkRabinMsgArray = Buffer.alloc(0);
  let checkRabinPaddingArray = Buffer.alloc(0);
  let checkRabinSigArray = Buffer.alloc(0);

  let rabinPubKeyIndexArray: number[] = signerSelecteds;
  let rabinPubKeyVerifyArray: Int[] = [];

  let sigReqArray = [];
  for (let i = 0; i < rabinInputs.length; i++) {
    let v = rabinInputs[i];
    sigReqArray[i] = [];
    rabinPubKeyIndexArray.forEach((signerIndex) => {
      sigReqArray[i].push(
        signers[signerIndex].satoTxSigUTXOSpendByUTXO({
          txId: v.preTxId,
          index: v.preOutputIndex,
          txHex: v.preTxHex,
          byTxIndex: v.outputIndex,
          byTxId: v.txId,
          byTxHex: v.txHex,
        })
      );
    });
  }
  //Rabin Signature informations provided to TransferCheck/UnlockCheck
  for (let i = 0; i < sigReqArray.length; i++) {
    for (let j = 0; j < sigReqArray[i].length; j++) {
      let sigInfo = await sigReqArray[i][j];
      if (j == 0) {
        checkRabinMsgArray = Buffer.concat([
          checkRabinMsgArray,
          Buffer.from(sigInfo.byTxPayload, "hex"),
        ]);
        checkRabinData.rabinMsg = new Bytes(sigInfo.byTxPayload);
      }

      const sigBuf = TokenUtil.toBufferLE(
        sigInfo.byTxSigBE,
        TokenUtil.RABIN_SIG_LEN
      );
      checkRabinSigArray = Buffer.concat([checkRabinSigArray, sigBuf]);
      const paddingCountBuf = Buffer.alloc(2, 0);
      paddingCountBuf.writeUInt16LE(sigInfo.byTxPadding.length / 2);
      const padding = Buffer.alloc(sigInfo.byTxPadding.length / 2, 0);
      padding.write(sigInfo.byTxPadding, "hex");
      checkRabinPaddingArray = Buffer.concat([
        checkRabinPaddingArray,
        paddingCountBuf,
        padding,
      ]);
      checkRabinData.rabinSigArray.push(
        new Int(BN.fromString(sigInfo.byTxSigBE, 16).toString(10))
      );
      checkRabinData.rabinPaddingArray.push(new Bytes(sigInfo.byTxPadding));
    }
  }
  //Rabin Signature informations provided to Token

  for (let i = 0; i < sigReqArray.length; i++) {
    let rabinMsg: Bytes;
    let rabinSigArray: Int[] = [];
    let rabinPaddingArray: Bytes[] = [];
    for (let j = 0; j < sigReqArray[i].length; j++) {
      let sigInfo = await sigReqArray[i][j];
      rabinMsg = new Bytes(sigInfo.payload);
      rabinSigArray.push(
        new Int(BN.fromString(sigInfo.sigBE, 16).toString(10))
      );
      rabinPaddingArray.push(new Bytes(sigInfo.padding));
    }
    rabinDatas.push({
      rabinMsg,
      rabinSigArray,
      rabinPaddingArray,
    });
  }

  rabinPubKeyIndexArray.forEach((signerIndex) => {
    rabinPubKeyVerifyArray.push(
      new Int(signers[signerIndex].satotxPubKey.toString(10))
    );
  });
  return {
    rabinDatas,
    checkRabinDatas: {
      rabinMsgArray: new Bytes(toHex(checkRabinMsgArray)),
      rabinPaddingArray: new Bytes(toHex(checkRabinPaddingArray)),
      rabinSigArray: new Bytes(toHex(checkRabinSigArray)),
    },
    checkRabinData,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
  };
}

export async function selectSigners(
  signerConfigs: SignerConfig[],
  signerNum: number,
  signerVerifyNum: number
) {
  let _signerConfigs = signerConfigs.map((v) => Object.assign({}, v));
  if (_signerConfigs.length < signerNum) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `The length of signerArray should be ${signerNum}`
    );
  }
  let retPromises: Promise<{ url: string; idx: number }>[] = [];
  for (let i = 0; i < _signerConfigs.length; i++) {
    let signerConfig = _signerConfigs[i];
    let subArray = signerConfig.satotxApiPrefix.split(",");
    let ret = new Promise(
      (
        resolve: ({ url, idx }: { url: string; idx: number }) => void,
        reject
      ) => {
        let hasResolve = false;
        let failedCnt = 0;
        for (let j = 0; j < subArray.length; j++) {
          let url = subArray[j];
          let signer = new SatotxSigner(url);
          signer
            .getInfo()
            .then(() => {
              if (!hasResolve) {
                hasResolve = true;
                resolve({ url, idx: i });
              }
            })
            .catch((e) => {
              failedCnt++;
              if (failedCnt == subArray.length) {
                reject(e);
              }
            });
        }
      }
    );
    retPromises.push(ret);
  }

  let getSelected = new Promise(
    (resolve: (selected: number[]) => void, reject) => {
      let signerSelecteds = [];
      let hasResolve = false;
      let successCnt = 0;
      let failedCnt = 0;
      for (let j = 0; j < retPromises.length; j++) {
        retPromises[j]
          .then(({ idx, url }) => {
            successCnt++;
            _signerConfigs[idx].satotxApiPrefix = url;
            if (signerSelecteds.length < signerVerifyNum) {
              signerSelecteds.push(idx);
            }
            if (!hasResolve && successCnt == signerVerifyNum) {
              hasResolve = true;
              resolve(signerSelecteds);
            }
          })
          .catch((e) => {
            failedCnt++;
            if (failedCnt + successCnt == retPromises.length) {
              reject(
                new CodeError(
                  ErrCode.EC_INNER_ERROR,
                  `Less than ${signerVerifyNum} successful signer requests`
                )
              );
            }
          });
      }
    }
  );
  let signerSelecteds: number[] = await getSelected;
  signerSelecteds.sort((a, b) => a - b);
  return {
    signers: _signerConfigs,
    signerSelecteds,
  };
}
