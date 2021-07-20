import * as bsv from "../../bsv";
import { ContractAdapter } from "../../common/ContractAdapter";
import { dummyCodehash } from "../../common/dummy";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  Int,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import * as unlockProto from "../contract-proto/nftUnlockContractCheck.proto";

export class NftUnlockContractCheck extends ContractAdapter {
  constuctParams: { unlockType: NFT_UNLOCK_CONTRACT_TYPE };
  private _formatedDataPart: unlockProto.FormatedDataPart;
  constructor(constuctParams: { unlockType: NFT_UNLOCK_CONTRACT_TYPE }) {
    let desc;
    switch (constuctParams.unlockType) {
      case NFT_UNLOCK_CONTRACT_TYPE.OUT_3:
        desc = require("../contract-desc/nftUnlockContractCheck_desc.json");
        break;
      case NFT_UNLOCK_CONTRACT_TYPE.OUT_6:
        desc = require("../contract-desc/nftUnlockContractCheck_6_desc.json");
        break;
      case NFT_UNLOCK_CONTRACT_TYPE.OUT_10:
        desc = require("../contract-desc/nftUnlockContractCheck_10_desc.json");
        break;
      case NFT_UNLOCK_CONTRACT_TYPE.OUT_20:
        desc = require("../contract-desc/nftUnlockContractCheck_20_desc.json");
        break;
      case NFT_UNLOCK_CONTRACT_TYPE.OUT_100:
        desc = require("../contract-desc/nftUnlockContractCheck_100_desc.json");
        break;
      default:
        throw "invalid checkType";
    }
    const NftUnlockContractCheckClass = buildContractClass(desc);
    const unlockCheckContract = new NftUnlockContractCheckClass();
    super(unlockCheckContract);

    this.constuctParams = constuctParams;
  }

  clone() {
    let contract = new NftUnlockContractCheck(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: unlockProto.FormatedDataPart) {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    super.setDataPart(toHex(unlockProto.newDataPart(this._formatedDataPart)));
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public unlock({
    txPreimage,
    nftInputIndex,
    nftScript,
    prevouts,
    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
    nOutputs,
    nftOutputIndex,
    nftOutputSatoshis,
    otherOutputArray,
  }: {
    txPreimage: SigHashPreimage;
    nftInputIndex: number;
    nftScript: Bytes;
    prevouts: Bytes;
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes;
    rabinSigArray: Bytes;
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinPubKeyHashArray: Bytes;
    nOutputs: number;
    nftOutputIndex: number;
    nftOutputSatoshis: number;
    otherOutputArray: Bytes;
  }) {
    return this._contract.unlock(
      txPreimage,
      nftInputIndex,
      nftScript,
      prevouts,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      nOutputs,
      nftOutputIndex,
      nftOutputSatoshis,
      otherOutputArray
    ) as FunctionCall;
  }
}
export enum NFT_UNLOCK_CONTRACT_TYPE {
  OUT_3 = 1,
  OUT_6,
  OUT_10,
  OUT_20,
  OUT_100,
  UNSUPPORT,
}
export class NftUnlockContractCheckFactory {
  public static getOptimumType(outCount: number) {
    if (outCount <= 3) {
      return NFT_UNLOCK_CONTRACT_TYPE.OUT_3;
    } else if (outCount <= 6) {
      return NFT_UNLOCK_CONTRACT_TYPE.OUT_6;
    } else if (outCount <= 10) {
      return NFT_UNLOCK_CONTRACT_TYPE.OUT_10;
    } else if (outCount <= 20) {
      return NFT_UNLOCK_CONTRACT_TYPE.OUT_20;
    } else if (outCount <= 100) {
      return NFT_UNLOCK_CONTRACT_TYPE.OUT_100;
    } else {
      return NFT_UNLOCK_CONTRACT_TYPE.UNSUPPORT;
    }
  }

  public static createContract(
    unlockType: NFT_UNLOCK_CONTRACT_TYPE
  ): NftUnlockContractCheck {
    return new NftUnlockContractCheck({ unlockType });
  }

  public static getDummyInstance(unlockType: NFT_UNLOCK_CONTRACT_TYPE) {
    let contract = this.createContract(unlockType);
    contract.setFormatedDataPart({
      nftID: dummyCodehash.toBuffer(),
      nftCodeHash: Buffer.from(
        "0000000000000000000000000000000000000000",
        "hex"
      ),
    });
    return contract;
  }

  public static calLockingScriptSize(
    unlockType: NFT_UNLOCK_CONTRACT_TYPE
  ): number {
    let contract = this.getDummyInstance(unlockType);
    return (contract.lockingScript as bsv.Script).toBuffer().length;
  }
}
