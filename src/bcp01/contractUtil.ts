import {
  buildContractClass,
  Bytes,
  getPreimage,
  Int,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import {
  dummyAddress,
  dummyCodehash,
  dummyPadding,
  dummyPayload,
  dummyPk,
  dummyRabinPubKey,
  dummyRabinPubKeyHashArray,
  dummySigBE,
  dummyTx,
  dummyTxId,
} from "../common/dummy";
import { PROTO_TYPE } from "../common/protoheader";
import * as TokenUtil from "../common/tokenUtil";
import { isNull, SIG_PLACE_HOLDER } from "../common/utils";
import * as NftProto from "./nftProto";
import { SIGNER_VERIFY_NUM } from "./nftProto";
export const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";
const genesisFlag = 1;
const nonGenesisFlag = 0;

function getConractCodeHash(contract): string {
  return Buffer.from(
    bsv.crypto.Hash.sha256ripemd160(contract.lockingScript.toBuffer())
  ).toString("hex");
}

function getNftUnlockContractCheckCodeHashArray(): string[] {
  let class1 = NftUnlockContractCheck.getClass(
    NFT_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5
  );
  let class2 = NftUnlockContractCheck.getClass(
    NFT_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8
  );
  let class3 = NftUnlockContractCheck.getClass(
    NFT_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12
  );
  let class4 = NftUnlockContractCheck.getClass(
    NFT_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5
  );
  let class5 = NftUnlockContractCheck.getClass(
    NFT_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100
  );
  let contractArray = [
    new class1(),
    new class2(),
    new class3(),
    new class4(),
    new class5(),
  ];
  return contractArray.map((v) => getConractCodeHash(v));
}

type ContractConfig = {
  transferCheckCodeHashArray: string[];
  unlockContractCodeHashArray: string[];
  tokenGenesisSize: number;
  tokenSize: number;
  tokenTransferCheckSizes: number[];
};
export class ContractUtil {
  static unlockContractCodeHashArray: Bytes[];
  static tokenCodeHash: string;
  public static init(config?: ContractConfig) {
    if (config) {
      this.unlockContractCodeHashArray = config.unlockContractCodeHashArray.map(
        (v) => new Bytes(v)
      );
      NftGenesis.lockingScriptSize = config.tokenGenesisSize;
      Nft.lockingScriptSize = config.tokenSize;
    } else {
      this.unlockContractCodeHashArray = getNftUnlockContractCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      NftGenesis.lockingScriptSize = NftGenesis.calLockingScriptSize();
      Nft.lockingScriptSize = Nft.calLockingScriptSize();
    }

    let tokenContract = Nft.getDummyInstance();
    tokenContract.setDataPart("");
    let scriptBuf = tokenContract.lockingScript.toBuffer();
    scriptBuf = scriptBuf.slice(0, scriptBuf.length - 1); // remove OP_RETURN
    this.tokenCodeHash = toHex(bsv.crypto.Hash.sha256ripemd160(scriptBuf));
  }
}

export class NftGenesis {
  public static lockingScriptSize: number;
  public static getDesc() {
    return require("./contract-desc/nftGenesis_desc.json");
  }
  public static getClass() {
    return buildContractClass(this.getDesc());
  }
  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static unlock(
    instance: any,
    txPreimage: SigHashPreimage,
    sig: Sig,
    rabinMsg: Bytes,
    rabinPaddingArray: Bytes[],
    rabinSigArray: Int[],
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    genesisSatoshis: number,
    nftScript: Bytes,
    nftSatoshis: number,
    changeAddress: Ripemd160,
    changeSatoshis: number,
    opReturnScript: Bytes
  ) {
    return instance.unlock(
      txPreimage,
      sig,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      genesisSatoshis,
      nftScript,
      nftSatoshis,
      changeAddress,
      changeSatoshis,
      opReturnScript
    );
  }

  public static createContract(
    issuerPubKey: bsv.PublicKey,
    {
      totalSupply,
      rabinPubKeyHashArrayHash,
    }: {
      totalSupply?: BN;
      rabinPubKeyHashArrayHash?: string;
    } = {}
  ) {
    const GenesisContractClass = NftGenesis.getClass();
    const genesisContract = new GenesisContractClass(
      new PubKey(toHex(issuerPubKey))
    );
    if (!isNull(totalSupply)) {
      const dataPart = NftProto.newDataPart({
        totalSupply,
        genesisFlag,
        rabinPubKeyHashArrayHash,
        tokenType: PROTO_TYPE.NFT,
      });
      genesisContract.setDataPart(toHex(dataPart));
    }

    return genesisContract;
  }

  public static getDummyInstance() {
    let contract = this.createContract(dummyPk, {
      totalSupply: BN.One,
      rabinPubKeyHashArrayHash: dummyCodehash.toString(),
    });
    return contract;
  }
  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
    let size = contract.lockingScript.toBuffer().length;
    return size;
  }

  public static calUnlockingScriptSize(opreturnData) {
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }
    let contract = this.getDummyInstance();
    let tokenContract = Nft.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
    const rabinMsg = dummyPayload;
    const rabinPaddingArray = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray = [];
    const rabinPubKeyArray: Int[] = [];
    for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    let unlockedContract = this.unlock(
      contract,
      new SigHashPreimage(toHex(preimage)),
      new Sig(toHex(sig)),
      new Bytes(toHex(rabinMsg)),
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyArray,
      new Bytes(toHex(dummyRabinPubKeyHashArray)),
      1000,
      new Bytes(tokenContract.lockingScript.toHex()),
      1000,
      new Ripemd160(toHex(dummyAddress.hashBuffer)),
      1000,
      new Bytes(opreturnScriptHex)
    );
    return unlockedContract.toScript().toBuffer().length;
  }
}

export class Nft {
  public static lockingScriptSize: number;
  public static getDesc() {
    return require("./contract-desc/nft_desc.json");
  }
  public static getClass() {
    return buildContractClass(this.getDesc());
  }
  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static newContract(unlockContractCodeHashArray: Bytes[]) {
    let ClassObj = this.getClass();
    return new ClassObj(unlockContractCodeHashArray);
  }

  public static unlock(
    instance: any,
    txPreimage: SigHashPreimage,
    nftInputIndex: number,
    prevouts: Bytes,
    rabinMsg: Bytes,
    rabinPaddingArray: Bytes[],
    rabinSigArray: Int[],
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    prevNftAddress: Bytes,
    senderPubKey: PubKey,
    senderSig: Sig,
    receiverAddress: Bytes,
    nftOutputSatoshis: Int,
    opReturnScript: Bytes,
    changeAddress: Ripemd160,
    changeSatoshis: Int,
    checkInputIndex: number,
    checkScriptTx: Bytes,
    checkScriptTxOutIndex: number,
    lockContractInputIndex: number,
    lockContractTx: Bytes,
    lockContractTxOutIndex: number,
    operation: number
  ) {
    return instance.unlock(
      txPreimage,
      nftInputIndex,
      prevouts,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      prevNftAddress,
      senderPubKey,
      senderSig,
      receiverAddress,
      nftOutputSatoshis,
      opReturnScript,
      changeAddress,
      changeSatoshis,
      checkInputIndex,
      checkScriptTx,
      checkScriptTxOutIndex,
      lockContractInputIndex,
      lockContractTx,
      lockContractTxOutIndex,
      operation
    );
  }

  /**
   * create token contract from genesis contract utxo
   * @param {string} genesisTxId the genesis txid
   * @param {number} genesisTxOutputIndex the genesis utxo output index
   * @param {bsv.Script} genesisScript the genesis contract's locking script
   * @param {bsv.Address} receiverAddress receiver's address
   * @param {BigInt} tokenAmount the token amount want to create
   * @returns
   */
  public static createContract(
    genesisTxId: string,
    genesisTxOutputIndex: number,
    genesisLockingScript: any,
    unlockContractCodeHashArray: Bytes[],
    {
      receiverAddress,
      tokenIndex,
      metaTxId = toHex(Buffer.alloc(32, 0)),
      metaOutputIndex = 0,
    }: {
      receiverAddress: bsv.Address;
      tokenIndex: BN;
      metaTxId?: string;
      metaOutputIndex?: number;
    }
  ) {
    const scriptBuffer = genesisLockingScript.toBuffer();
    const dataPartObj = NftProto.parseDataPart(scriptBuffer);

    let genesisHash = bsv.crypto.Hash.sha256ripemd160(scriptBuffer);
    if (dataPartObj.sensibleID.txid == genesisTokenIDTxid) {
      //首发
      dataPartObj.sensibleID = {
        txid: genesisTxId,
        index: genesisTxOutputIndex,
      };
    }

    const nftContract = Nft.newContract(unlockContractCodeHashArray);
    if (receiverAddress) {
      dataPartObj.genesisFlag = nonGenesisFlag;
      dataPartObj.nftAddress = toHex(receiverAddress.hashBuffer);
      dataPartObj.genesisHash = toHex(genesisHash);
      dataPartObj.tokenIndex = tokenIndex;
      dataPartObj.metaidOutpoint = { txid: metaTxId, index: metaOutputIndex };
      const dataPart = NftProto.newDataPart(dataPartObj);
      nftContract.setDataPart(toHex(dataPart));
    }
    return nftContract;
  }

  public static getDummyInstance() {
    let tokenGenesisContract = NftGenesis.createContract(dummyPk, {
      totalSupply: BN.One,
      rabinPubKeyHashArrayHash: dummyCodehash.toString(),
    });
    let contract = this.createContract(
      dummyTxId,
      0,
      tokenGenesisContract.lockingScript,
      ContractUtil.unlockContractCodeHashArray,
      { receiverAddress: dummyAddress, tokenIndex: BN.One }
    );
    return contract;
  }
  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
    return contract.lockingScript.toBuffer().length;
  }

  public static calUnlockingScriptSize(
    bsvInputLen: number,
    opreturnData: any
  ): number {
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }

    let contract = this.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
    const rabinMsg = new Bytes(dummyPayload);
    const rabinPaddingArray: Bytes[] = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray: number[] = [];
    const rabinPubKeyArray: Int[] = [];
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
    for (let i = 0; i < 1 + bsvInputLen; i++) {
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    let changeSatoshis = 0;
    let unlockedContract = this.unlock(
      contract,
      new SigHashPreimage(toHex(preimage)),
      tokenInputIndex,
      new Bytes(toHex(prevouts)),
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyArray,
      new Bytes(toHex(dummyRabinPubKeyHashArray)),
      new Bytes(toHex(dummyAddress.hashBuffer)),
      new PubKey(toHex(dummyPk)),
      new Sig(toHex(sig)),
      new Bytes(toHex(dummyAddress.hashBuffer)),
      new Int(0),
      new Bytes(opreturnScriptHex),
      new Ripemd160(toHex(dummyAddress.hashBuffer)),
      new Int(changeSatoshis),
      0,
      new Bytes("00"),
      0,
      0,
      new Bytes("00"),
      0,
      NftProto.OP_TRANSFER
    );
    return unlockedContract.toScript().toBuffer().length;
  }
}

export enum NFT_UNLOCK_CONTRACT_TYPE {
  IN_2_OUT_5 = 1,
  IN_4_OUT_8,
  IN_8_OUT_12,
  IN_3_OUT_100,
  IN_20_OUT_5,
  UNSUPPORT,
}
export class NftUnlockContractCheck {
  public static getDesc(checkType: NFT_UNLOCK_CONTRACT_TYPE) {
    switch (checkType) {
      case NFT_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5:
        return require("./contract-desc/nftUnlockContractCheck_desc.json");
      case NFT_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8:
        return require("./contract-desc/nftUnlockContractCheck_desc.json");
      case NFT_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12:
        return require("./contract-desc/nftUnlockContractCheck_desc.json");
      case NFT_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100:
        return require("./contract-desc/nftUnlockContractCheck_desc.json");
      case NFT_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5:
        return require("./contract-desc/nftUnlockContractCheck_desc.json");
      default:
        throw "invalid checkType";
    }
  }
  public static getClass(checkType: NFT_UNLOCK_CONTRACT_TYPE) {
    return buildContractClass(this.getDesc(checkType));
  }

  public static getOptimumType(inCount: number, outCount: number) {
    if (inCount <= 2 && outCount <= 5) {
      return NFT_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5;
    } else if (inCount <= 4 && outCount <= 8) {
      return NFT_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8;
    } else if (inCount <= 8 && outCount <= 12) {
      return NFT_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12;
    } else if (inCount <= 20 && outCount <= 5) {
      return NFT_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5;
    } else if (inCount <= 3 && outCount <= 100) {
      return NFT_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100;
    } else {
      return NFT_UNLOCK_CONTRACT_TYPE.UNSUPPORT;
    }
  }
  public static unlock(
    instance: any,
    txPreimage: SigHashPreimage,
    nftInputIndex: number,
    nftScript: Bytes,
    prevouts: Bytes,
    rabinMsg: Bytes,
    rabinPaddingArray: Bytes,
    rabinSigArray: Bytes,
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    nOutputs: number,
    nftOutputIndex: number,
    nftOutputSatoshis: number,
    otherOutputArray: Bytes
  ) {
    return instance.unlock(
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
    );
  }
}
