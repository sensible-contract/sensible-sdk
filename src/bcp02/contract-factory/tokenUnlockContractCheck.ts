import { ContractAdapter } from "../../common/ContractAdapter";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import * as proto from "../contract-proto/tokenUnlockContractCheck.proto";

export enum TOKEN_UNLOCK_TYPE {
  IN_2_OUT_5 = 1,
  IN_4_OUT_8,
  IN_8_OUT_12,
  IN_3_OUT_100,
  IN_20_OUT_5,
  UNSUPPORT,
}
export class TokenUnlockContractCheck extends ContractAdapter {
  constuctParams: {
    unlockType: TOKEN_UNLOCK_TYPE;
  };
  private _formatedDataPart: proto.FormatedDataPart;

  constructor(constuctParams: { unlockType: TOKEN_UNLOCK_TYPE }) {
    let desc;

    switch (constuctParams.unlockType) {
      case TOKEN_UNLOCK_TYPE.IN_2_OUT_5:
        desc = require("../contract-desc/tokenUnlockContractCheck_desc.json");
        break;
      case TOKEN_UNLOCK_TYPE.IN_4_OUT_8:
        desc = require("../contract-desc/tokenUnlockContractCheck_4To8_desc.json");
        break;
      case TOKEN_UNLOCK_TYPE.IN_8_OUT_12:
        desc = require("../contract-desc/tokenUnlockContractCheck_8To12_desc.json");
        break;
      case TOKEN_UNLOCK_TYPE.IN_3_OUT_100:
        desc = require("../contract-desc/tokenUnlockContractCheck_3To100_desc.json");
        break;
      case TOKEN_UNLOCK_TYPE.IN_20_OUT_5:
        desc = require("../contract-desc/tokenUnlockContractCheck_20To5_desc.json");
        break;
      default:
        throw "invalid unlockType";
    }

    let ClassObj = buildContractClass(desc);
    let contract = new ClassObj();
    super(contract);

    this.constuctParams = constuctParams;
    this._formatedDataPart = {};
  }

  clone() {
    let contract = new TokenUnlockContractCheck(this.constuctParams);
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
    nOutputs,
    tokenOutputIndexArray,
    tokenOutputSatoshiArray,
    otherOutputArray,
  }: {
    txPreimage: SigHashPreimage;
    tokenScript: Bytes;
    prevouts: Bytes;
    rabinMsgArray: Bytes;
    rabinPaddingArray: Bytes;
    rabinSigArray: Bytes;
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: bigint | string[];
    rabinPubKeyHashArray: Bytes;
    inputTokenAddressArray: Bytes;
    inputTokenAmountArray: Bytes;
    nOutputs: number;
    tokenOutputIndexArray: Bytes;
    tokenOutputSatoshiArray: Bytes;
    otherOutputArray: Bytes;
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
      nOutputs,
      tokenOutputIndexArray,
      tokenOutputSatoshiArray,
      otherOutputArray
    ) as FunctionCall;
  }
}

export class TokenUnlockContractCheckFactory {
  public static getOptimumType(inCount: number, outCount: number) {
    if (inCount <= 2 && outCount <= 5) {
      return TOKEN_UNLOCK_TYPE.IN_2_OUT_5;
    } else if (inCount <= 4 && outCount <= 8) {
      return TOKEN_UNLOCK_TYPE.IN_4_OUT_8;
    } else if (inCount <= 8 && outCount <= 12) {
      return TOKEN_UNLOCK_TYPE.IN_8_OUT_12;
    } else if (inCount <= 20 && outCount <= 5) {
      return TOKEN_UNLOCK_TYPE.IN_20_OUT_5;
    } else if (inCount <= 3 && outCount <= 100) {
      return TOKEN_UNLOCK_TYPE.IN_3_OUT_100;
    } else {
      return TOKEN_UNLOCK_TYPE.UNSUPPORT;
    }
  }

  public static createContract(unlockType: TOKEN_UNLOCK_TYPE) {
    return new TokenUnlockContractCheck({ unlockType });
  }
}
