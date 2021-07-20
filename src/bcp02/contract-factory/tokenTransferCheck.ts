import * as BN from "../../bn.js";
import * as bsv from "../../bsv";
import { ContractAdapter } from "../../common/ContractAdapter";
import {
  dummyAddress,
  dummyCodehash,
  dummyPadding,
  dummyPayload,
  dummyRabinPubKey,
  dummyRabinPubKeyHashArray,
  dummySigBE,
  dummyTx,
  dummyTxId,
} from "../../common/dummy";
import * as TokenUtil from "../../common/tokenUtil";
import { PLACE_HOLDER_SIG } from "../../common/utils";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  Int,
  Ripemd160,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import { SIGNER_VERIFY_NUM } from "../contract-proto/token.proto";
import * as proto from "../contract-proto/tokenTransferCheck.proto";
import { TokenFactory } from "./token";
export enum TOKEN_TRANSFER_TYPE {
  IN_3_OUT_3 = 1,
  IN_6_OUT_6,
  IN_10_OUT_10,
  IN_20_OUT_3,
  IN_3_OUT_100,
  UNSUPPORT,
}

let _tokenTransferTypeInfos = [
  {
    type: TOKEN_TRANSFER_TYPE.IN_3_OUT_3,
    in: 3,
    out: 3,
    lockingScriptSize: 0,
  },
  {
    type: TOKEN_TRANSFER_TYPE.IN_6_OUT_6,
    in: 6,
    out: 6,
    lockingScriptSize: 0,
  },
  {
    type: TOKEN_TRANSFER_TYPE.IN_10_OUT_10,
    in: 10,
    out: 10,
    lockingScriptSize: 0,
  },
  {
    type: TOKEN_TRANSFER_TYPE.IN_20_OUT_3,
    in: 20,
    out: 3,
    lockingScriptSize: 0,
  },
  {
    type: TOKEN_TRANSFER_TYPE.IN_3_OUT_100,
    in: 3,
    out: 100,
    lockingScriptSize: 0,
  },
];

export class TokenTransferCheck extends ContractAdapter {
  constuctParams: {
    checkType: TOKEN_TRANSFER_TYPE;
  };
  private _formatedDataPart: proto.FormatedDataPart;

  constructor(constuctParams: { checkType: TOKEN_TRANSFER_TYPE }) {
    let desc;

    switch (constuctParams.checkType) {
      case TOKEN_TRANSFER_TYPE.IN_3_OUT_3:
        desc = require("../contract-desc/tokenTransferCheck_desc.json");
        break;
      case TOKEN_TRANSFER_TYPE.IN_6_OUT_6:
        desc = require("../contract-desc/tokenTransferCheck_6To6_desc.json");
        break;
      case TOKEN_TRANSFER_TYPE.IN_10_OUT_10:
        desc = require("../contract-desc/tokenTransferCheck_10To10_desc.json");
        break;
      case TOKEN_TRANSFER_TYPE.IN_3_OUT_100:
        desc = require("../contract-desc/tokenTransferCheck_3To100_desc.json");
        break;
      case TOKEN_TRANSFER_TYPE.IN_20_OUT_3:
        desc = require("../contract-desc/tokenTransferCheck_20To3_desc.json");
        break;
      default:
        throw "invalid checkType";
    }

    let ClassObj = buildContractClass(desc);
    let contract = new ClassObj();
    super(contract);

    this.constuctParams = constuctParams;
    this._formatedDataPart = {};
  }

  clone() {
    let contract = new TokenTransferCheck(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: proto.FormatedDataPart): void {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    super.setDataPart(toHex(proto.newDataPart(this._formatedDataPart)));
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public unlock({
    txPreimage,
    tokenScript,
    prevouts,
    rabinMsgArray,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
    inputTokenAddressArray,
    inputTokenAmountArray,
    receiverSatoshiArray,
    changeSatoshis,
    changeAddress,
    opReturnScript,
  }: {
    txPreimage: SigHashPreimage;
    tokenScript: Bytes;
    prevouts: Bytes;
    rabinMsgArray: Bytes;
    rabinPaddingArray: Bytes;
    rabinSigArray: Bytes;
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinPubKeyHashArray: Bytes;
    inputTokenAddressArray: Bytes;
    inputTokenAmountArray: Bytes;
    receiverSatoshiArray: Bytes;
    changeSatoshis: Int;
    changeAddress: Ripemd160;
    opReturnScript: Bytes;
  }) {
    return this._contract.unlock(
      txPreimage,
      tokenScript,
      prevouts,
      rabinMsgArray,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      inputTokenAddressArray,
      inputTokenAmountArray,
      receiverSatoshiArray,
      changeSatoshis,
      changeAddress,
      opReturnScript
    ) as FunctionCall;
  }
}

export class TokenTransferCheckFactory {
  public static tokenTransferTypeInfos: {
    type: TOKEN_TRANSFER_TYPE;
    in: number;
    out: number;
    lockingScriptSize: number;
  }[] = _tokenTransferTypeInfos;

  public static getLockingScriptSize(checkType: TOKEN_TRANSFER_TYPE) {
    return this.tokenTransferTypeInfos.find((v) => v.type == checkType)
      .lockingScriptSize;
  }
  public static getOptimumType(inCount: number, outCount: number) {
    let typeInfo = this.tokenTransferTypeInfos.find(
      (v) => inCount <= v.in && outCount <= v.out
    );
    if (!typeInfo) {
      return TOKEN_TRANSFER_TYPE.UNSUPPORT;
    }
    return typeInfo.type;
  }

  public static createContract(tokenTransferType: TOKEN_TRANSFER_TYPE) {
    return new TokenTransferCheck({ checkType: tokenTransferType });
  }

  public static getDummyInstance(checkType: TOKEN_TRANSFER_TYPE) {
    let v = this.tokenTransferTypeInfos.find((v) => v.type == checkType);
    let tokenInputArray = new Array(v.in).fill(0);
    let tokenOutputArray = new Array(v.out).fill({
      address: dummyAddress,
      tokenAmount: BN.Zero,
    });
    let contract = this.createContract(v.type);
    contract.setFormatedDataPart({
      nSenders: tokenInputArray.length,
      receiverTokenAmountArray: tokenOutputArray.map((v) => v.tokenAmount),

      receiverArray: tokenOutputArray.map((v) => v.address),
      nReceivers: tokenOutputArray.length,
      tokenCodeHash: toHex(dummyCodehash),
      tokenID: toHex(dummyCodehash),
    });
    return contract;
  }
  public static calLockingScriptSize(checkType: TOKEN_TRANSFER_TYPE): number {
    let contract = this.getDummyInstance(checkType);
    return contract.lockingScript.toBuffer().length;
  }

  public static calUnlockingScriptSize(
    checkType: TOKEN_TRANSFER_TYPE,
    bsvInputLen: number,
    tokenInputLen: number,
    tokenOutputLen: number,
    opreturnData: any
  ): number {
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }

    let contract = this.getDummyInstance(checkType);
    let tokenContractInstance = TokenFactory.getDummyInstance();

    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(PLACE_HOLDER_SIG, "hex");
    const rabinMsg = dummyPayload;
    let checkRabinMsgArray = Buffer.alloc(0);
    let checkRabinSigArray = Buffer.alloc(0);
    let checkRabinPaddingArray = Buffer.alloc(0);
    let paddingCountBuf = Buffer.alloc(2, 0);
    paddingCountBuf.writeUInt16LE(dummyPadding.length / 2);
    const padding = Buffer.alloc(dummyPadding.length / 2, 0);
    padding.write(dummyPadding, "hex");

    const rabinPaddingArray: Bytes[] = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray: number[] = [];
    const rabinPubKeyArray: Int[] = [];
    const sigBuf = TokenUtil.toBufferLE(dummySigBE, TokenUtil.RABIN_SIG_LEN);
    let inputTokenAddressArray = Buffer.alloc(0);
    let inputTokenAmountArray = Buffer.alloc(0);
    let tokenAmount = Buffer.alloc(8);
    tokenAmount.writeInt32BE(100000);
    for (let i = 0; i < tokenInputLen; i++) {
      inputTokenAddressArray = Buffer.concat([
        inputTokenAddressArray,
        dummyAddress.toBuffer(),
      ]);
      inputTokenAmountArray = Buffer.concat([
        inputTokenAmountArray,
        tokenAmount,
      ]);
      for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
        if (j == 0) {
          checkRabinMsgArray = Buffer.concat([
            checkRabinMsgArray,
            Buffer.from(dummyPayload, "hex"),
          ]);
        }

        checkRabinSigArray = Buffer.concat([checkRabinSigArray, sigBuf]);

        checkRabinPaddingArray = Buffer.concat([
          checkRabinPaddingArray,
          paddingCountBuf,
          padding,
        ]);
      }
    }
    for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    const tokenInputIndex = 0;
    let prevouts = Buffer.alloc(0);
    const indexBuf = TokenUtil.getUInt32Buf(0);
    const txidBuf = TokenUtil.getTxIdBuf(dummyTxId);
    for (let i = 0; i < tokenInputLen + bsvInputLen + 1; i++) {
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    let receiverSatoshiArray = Buffer.alloc(0);
    for (let i = 0; i < tokenOutputLen; i++) {
      receiverSatoshiArray = Buffer.concat([
        receiverSatoshiArray,
        Buffer.alloc(8),
      ]);
    }

    let unlockedContract = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      tokenScript: new Bytes(tokenContractInstance.lockingScript.toHex()),
      prevouts: new Bytes(toHex(prevouts)),
      rabinMsgArray: new Bytes(toHex(checkRabinMsgArray)),
      rabinPaddingArray: new Bytes(toHex(checkRabinPaddingArray)),
      rabinSigArray: new Bytes(toHex(checkRabinSigArray)),
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
      inputTokenAddressArray: new Bytes(toHex(inputTokenAddressArray)),
      inputTokenAmountArray: new Bytes(toHex(inputTokenAmountArray)),
      receiverSatoshiArray: new Bytes(toHex(receiverSatoshiArray)),
      changeSatoshis: new Int(1000),
      changeAddress: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      opReturnScript: new Bytes(opreturnScriptHex),
    });
    return (unlockedContract.toScript() as bsv.Script).toBuffer().length;
  }
}
