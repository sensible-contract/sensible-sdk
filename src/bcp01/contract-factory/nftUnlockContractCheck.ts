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
} from "../../common/dummy";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  Int,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import { SIGNER_VERIFY_NUM } from "../contract-proto/nft.proto";
import * as unlockProto from "../contract-proto/nftUnlockContractCheck.proto";
import { NftFactory } from "./nft";
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
    nftOutputAddress,
    nftOutputSatoshis,
    otherOutputArray,
  }: {
    txPreimage: SigHashPreimage;
    nftInputIndex: number;
    nftScript: Bytes;
    prevouts: Bytes;
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinPubKeyHashArray: Bytes;
    nOutputs: number;
    nftOutputIndex: number;
    nftOutputAddress: Bytes;
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
      nftOutputAddress,
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

let _unlockContractTypeInfos = [
  {
    type: NFT_UNLOCK_CONTRACT_TYPE.OUT_3,
    out: 3,
    lockingScriptSize: 0,
  },
  {
    type: NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
    out: 6,
    lockingScriptSize: 0,
  },
  {
    type: NFT_UNLOCK_CONTRACT_TYPE.OUT_10,
    out: 10,
    lockingScriptSize: 0,
  },
  {
    type: NFT_UNLOCK_CONTRACT_TYPE.OUT_20,
    out: 20,
    lockingScriptSize: 0,
  },
  {
    type: NFT_UNLOCK_CONTRACT_TYPE.OUT_100,
    out: 100,
    lockingScriptSize: 0,
  },
];

export class NftUnlockContractCheckFactory {
  public static unlockContractTypeInfos: {
    type: NFT_UNLOCK_CONTRACT_TYPE;
    out: number;
    lockingScriptSize: number;
  }[] = _unlockContractTypeInfos;

  public static getLockingScriptSize(unlockType: NFT_UNLOCK_CONTRACT_TYPE) {
    return this.unlockContractTypeInfos.find((v) => v.type == unlockType)
      .lockingScriptSize;
  }

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

  public static calUnlockingScriptSize(
    unlockType: NFT_UNLOCK_CONTRACT_TYPE,
    prevouts: Bytes,
    otherOutputArray: Bytes
  ): number {
    let contract = this.getDummyInstance(unlockType);
    let nftContractInstance = NftFactory.getDummyInstance();

    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const rabinMsg = new Bytes(dummyPayload);
    let paddingCountBuf = Buffer.alloc(2, 0);
    paddingCountBuf.writeUInt16LE(dummyPadding.length / 2);
    const padding = Buffer.alloc(dummyPadding.length / 2, 0);
    padding.write(dummyPadding, "hex");

    const rabinPaddingArray: Bytes[] = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray: number[] = [];
    const rabinPubKeyArray: Int[] = [];
    let tokenAmount = Buffer.alloc(8);
    tokenAmount.writeInt32BE(100000);

    for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    let unlockedContract = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      nftInputIndex: 0,
      nftScript: new Bytes(nftContractInstance.lockingScript.toHex()),
      prevouts: prevouts,
      rabinMsg: rabinMsg,
      rabinPaddingArray: rabinPaddingArray,
      rabinSigArray: rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
      nOutputs: 2,
      nftOutputIndex: 0,
      nftOutputAddress: new Bytes(toHex(dummyAddress.hashBuffer)),
      nftOutputSatoshis: 1000,
      otherOutputArray,
    });
    return (unlockedContract.toScript() as bsv.Script).toBuffer().length;
  }
}
