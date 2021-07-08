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
import * as TokenProto from "./tokenProto";
import { SIGNER_VERIFY_NUM } from "./tokenProto";
import BN = require("../bn.js");
export const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";
const genesisFlag = 1;
const nonGenesisFlag = 0;

function getConractCodeHash(contract): string {
  return Buffer.from(
    bsv.crypto.Hash.sha256ripemd160(contract.lockingScript.toBuffer())
  ).toString("hex");
}
function getTokenTransferCheckCodeHashArray(): string[] {
  let class1 = TokenTransferCheck.getClass(TOKEN_TRANSFER_TYPE.IN_3_OUT_3);
  let class2 = TokenTransferCheck.getClass(TOKEN_TRANSFER_TYPE.IN_6_OUT_6);
  let class3 = TokenTransferCheck.getClass(TOKEN_TRANSFER_TYPE.IN_10_OUT_10);
  let class4 = TokenTransferCheck.getClass(TOKEN_TRANSFER_TYPE.IN_20_OUT_3);
  let class5 = TokenTransferCheck.getClass(TOKEN_TRANSFER_TYPE.IN_3_OUT_100);
  let contractArray = [
    new class1(),
    new class2(),
    new class3(),
    new class4(),
    new class5(),
  ];
  return contractArray.map((v) => getConractCodeHash(v));
}

function getTokenUnlockContractCheckCodeHashArray(): string[] {
  let class1 = TokenUnlockContractCheck.getClass(
    TOKEN_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5
  );
  let class2 = TokenUnlockContractCheck.getClass(
    TOKEN_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8
  );
  let class3 = TokenUnlockContractCheck.getClass(
    TOKEN_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12
  );
  let class4 = TokenUnlockContractCheck.getClass(
    TOKEN_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5
  );
  let class5 = TokenUnlockContractCheck.getClass(
    TOKEN_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100
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
  static transferCheckCodeHashArray: Bytes[];
  static unlockContractCodeHashArray: Bytes[];
  static tokenCodeHash: string;
  public static init(config?: ContractConfig) {
    if (config) {
      this.transferCheckCodeHashArray = config.transferCheckCodeHashArray.map(
        (v) => new Bytes(v)
      );
      this.unlockContractCodeHashArray = config.unlockContractCodeHashArray.map(
        (v) => new Bytes(v)
      );
      TokenGenesis.lockingScriptSize = config.tokenGenesisSize;
      Token.lockingScriptSize = config.tokenSize;
      TokenTransferCheck.tokenTransferTypeInfos.forEach((v, idx) => {
        v.lockingScriptSize = config.tokenTransferCheckSizes[idx];
      });
    } else {
      this.transferCheckCodeHashArray = getTokenTransferCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      this.unlockContractCodeHashArray = getTokenUnlockContractCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      TokenGenesis.lockingScriptSize = TokenGenesis.calLockingScriptSize();
      Token.lockingScriptSize = Token.calLockingScriptSize();
      TokenTransferCheck.tokenTransferTypeInfos.forEach((v, idx) => {
        v.lockingScriptSize = TokenTransferCheck.calLockingScriptSize(v.type);
      });
    }

    let tokenContract = Token.getDummyInstance();
    tokenContract.setDataPart("");
    let scriptBuf = tokenContract.lockingScript.toBuffer();
    scriptBuf = scriptBuf.slice(0, scriptBuf.length - 1); // remove OP_RETURN
    this.tokenCodeHash = toHex(bsv.crypto.Hash.sha256ripemd160(scriptBuf));
  }
}

export class TokenGenesis {
  public static lockingScriptSize: number;
  public static getDesc() {
    return require("./contract-desc/tokenGenesis_desc.json");
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
    rabinPubKeyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    genesisSatoshis: number,
    tokenScript: Bytes,
    tokenSatoshis: number,
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
      rabinPubKeyArray,
      rabinPubKeyHashArray,
      genesisSatoshis,
      tokenScript,
      tokenSatoshis,
      changeAddress,
      changeSatoshis,
      opReturnScript
    );
  }

  /**
   * create genesis contract
   * @param {Object} issuerPubKey issuer public key used to unlocking genesis contract
   * @param {string} tokenName the token name
   * @param {string} tokenSymbol the token symbol
   * @param {number} decimalNum the token amount decimal number
   * @returns
   */
  public static createContract(
    issuerPubKey: bsv.PublicKey,
    {
      tokenName,
      tokenSymbol,
      decimalNum,
      rabinPubKeyHashArrayHash,
    }: {
      tokenName?: string;
      tokenSymbol?: string;
      decimalNum?: number;
      rabinPubKeyHashArrayHash?: string;
    } = {}
  ) {
    const GenesisContractClass = TokenGenesis.getClass();
    const genesisContract = new GenesisContractClass(
      new PubKey(toHex(issuerPubKey))
    );
    if (!isNull(tokenName)) {
      const dataPart = TokenProto.newDataPart({
        tokenName,
        tokenSymbol,
        genesisFlag,
        decimalNum,
        rabinPubKeyHashArrayHash,
        tokenType: PROTO_TYPE.FT,
      });
      genesisContract.setDataPart(toHex(dataPart));
    }

    return genesisContract;
  }

  public static getDummyInstance() {
    let contract = this.createContract(dummyPk, {
      tokenName: "",
      tokenSymbol: "",
      decimalNum: 0,
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
    let tokenContract = Token.getDummyInstance();
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

export class Token {
  public static lockingScriptSize: number;
  public static getDesc() {
    return require("./contract-desc/token_desc.json");
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
    tokenInputIndex: number,
    prevouts: Bytes,
    rabinMsg: Bytes,
    rabinPaddingArray: Bytes[],
    rabinSigArray: Int[],
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    checkInputIndex: number,
    checkScriptTx: Bytes,
    nReceivers: number,
    prevTokenAddress: Bytes,
    prevTokenAmount: string,
    senderPubKey: PubKey, // only transfer need
    senderSig: Sig, // only transfer need
    lockContractInputIndex: number, // only unlockFromContract need
    lockContractTx: Bytes, // only unlockFromContract need
    operation: number
  ) {
    return instance.unlock(
      txPreimage,
      tokenInputIndex,
      prevouts,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      checkInputIndex,
      checkScriptTx,
      nReceivers,
      prevTokenAddress,
      prevTokenAmount,
      senderPubKey,
      senderSig,
      lockContractInputIndex,
      lockContractTx,
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
    transferCheckCodeHashArray: Bytes[],
    unlockContractCodeHashArray: Bytes[],
    {
      receiverAddress,
      tokenAmount,
    }: { receiverAddress: bsv.Address; tokenAmount: BN }
  ) {
    const scriptBuffer = genesisLockingScript.toBuffer();
    const dataPartObj = TokenProto.parseDataPart(scriptBuffer);

    let genesisHash: Buffer;
    if (dataPartObj.sensibleID.txid == genesisTokenIDTxid) {
      //首发
      dataPartObj.sensibleID = {
        txid: genesisTxId,
        index: genesisTxOutputIndex,
      };
      const newScriptBuf = TokenProto.updateScript(scriptBuffer, dataPartObj);
      genesisHash = bsv.crypto.Hash.sha256ripemd160(newScriptBuf); //to avoid generate the same genesisHash,
    } else {
      //增发
      genesisHash = bsv.crypto.Hash.sha256ripemd160(scriptBuffer);
    }

    const TokenContractClass = Token.getClass();
    const tokenContract = new TokenContractClass(
      transferCheckCodeHashArray,
      unlockContractCodeHashArray
    );
    if (receiverAddress) {
      dataPartObj.genesisFlag = nonGenesisFlag;
      dataPartObj.tokenAddress = toHex(receiverAddress.hashBuffer);
      dataPartObj.tokenAmount = tokenAmount;
      dataPartObj.genesisHash = toHex(genesisHash);
      const dataPart = TokenProto.newDataPart(dataPartObj);
      tokenContract.setDataPart(toHex(dataPart));
    }
    return tokenContract;
  }

  public static getDummyInstance() {
    let tokenGenesisContract = TokenGenesis.createContract(dummyPk, {
      tokenName: "",
      tokenSymbol: "",
      decimalNum: 0,
      rabinPubKeyHashArrayHash: dummyCodehash.toString(),
    });
    let contract = this.createContract(
      dummyTxId,
      0,
      tokenGenesisContract.lockingScript,
      ContractUtil.transferCheckCodeHashArray,
      ContractUtil.unlockContractCodeHashArray,
      { receiverAddress: dummyAddress, tokenAmount: BN.Zero }
    );
    return contract;
  }
  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
    return contract.lockingScript.toBuffer().length;
  }

  public static calUnlockingScriptSize(
    routeCheckContact: any,
    bsvInputLen: number,
    tokenInputLen: number,
    tokenOutputLen: number
  ) {
    let contract = this.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
    const rabinMsg = dummyPayload;
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
    for (let i = 0; i < tokenInputLen + bsvInputLen + 1; i++) {
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }
    const routeCheckInputIndex = 0;
    let routeCheckTx = new bsv.Transaction(dummyTx.serialize(true));
    routeCheckTx.addOutput(
      new bsv.Transaction.Output({
        script: routeCheckContact.lockingScript,
        satoshis: 10000,
      })
    );

    let unlockedContract = this.unlock(
      contract,
      new SigHashPreimage(toHex(preimage)),
      tokenInputIndex,
      new Bytes(toHex(prevouts)),
      new Bytes(toHex(rabinMsg)),
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyArray,
      new Bytes(toHex(dummyRabinPubKeyHashArray)),
      routeCheckInputIndex,
      new Bytes(routeCheckTx.serialize(true)),
      tokenOutputLen,
      new Bytes(toHex(dummyAddress.hashBuffer)),
      "1000000000",
      new PubKey(toHex(dummyPk)),
      new Sig(toHex(sig)),
      0,
      new Bytes("00"),
      TokenProto.OP_TRANSFER
    );
    return unlockedContract.toScript().toBuffer().length;
  }
}

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

export class TokenTransferCheck {
  public static tokenTransferTypeInfos: {
    type: TOKEN_TRANSFER_TYPE;
    in: number;
    out: number;
    lockingScriptSize: number;
  }[] = _tokenTransferTypeInfos;
  public static getDesc(checkType: TOKEN_TRANSFER_TYPE) {
    switch (checkType) {
      case TOKEN_TRANSFER_TYPE.IN_3_OUT_3:
        return require("./contract-desc/tokenTransferCheck_desc.json");
      case TOKEN_TRANSFER_TYPE.IN_6_OUT_6:
        return require("./contract-desc/tokenTransferCheck_6To6_desc.json");
      case TOKEN_TRANSFER_TYPE.IN_10_OUT_10:
        return require("./contract-desc/tokenTransferCheck_10To10_desc.json");
      case TOKEN_TRANSFER_TYPE.IN_3_OUT_100:
        return require("./contract-desc/tokenTransferCheck_3To100_desc.json");
      case TOKEN_TRANSFER_TYPE.IN_20_OUT_3:
        return require("./contract-desc/tokenTransferCheck_20To3_desc.json");
      default:
        throw "invalid checkType";
    }
  }
  public static getClass(checkType: TOKEN_TRANSFER_TYPE) {
    return buildContractClass(this.getDesc(checkType));
  }
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
  public static unlock(
    instance: any,
    txPreimage: SigHashPreimage,
    tokenScript: Bytes,
    prevouts: Bytes,
    rabinMsgArray: Bytes,
    rabinPaddingArray: Bytes,
    rabinSigArray: Bytes,
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: Int[],
    rabinPubKeyHashArray: Bytes,
    inputTokenAddressArray: Bytes,
    inputTokenAmountArray: Bytes,
    receiverSatoshiArray: Bytes,
    changeSatoshis: number,
    changeAddress: Ripemd160,
    opReturnScript: Bytes
  ) {
    return instance.unlock(
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
    );
  }

  public static createContract(
    tokenTransferType: TOKEN_TRANSFER_TYPE,
    tokenInputArray: any[],
    tokenOutputArray: { address: bsv.Address; tokenAmount: BN }[],
    tokenID: Buffer,
    tokenCodeHash: Buffer
  ) {
    let recervierArray = Buffer.alloc(0, 0);
    let receiverTokenAmountArray = Buffer.alloc(0, 0);
    for (let i = 0; i < tokenOutputArray.length; i++) {
      const item = tokenOutputArray[i];
      recervierArray = Buffer.concat([recervierArray, item.address.hashBuffer]);
      const amountBuf = item.tokenAmount.toBuffer({
        endian: "little",
        size: 8,
      });
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        amountBuf,
      ]);
    }
    const TokenTransferCheckClass = TokenTransferCheck.getClass(
      tokenTransferType
    );
    const tokenTransferCheckContract = new TokenTransferCheckClass();

    const data = Buffer.concat([
      TokenUtil.getUInt32Buf(tokenInputArray.length),
      receiverTokenAmountArray,
      recervierArray,
      TokenUtil.getUInt32Buf(tokenOutputArray.length),
      tokenCodeHash,
      tokenID,
    ]);
    tokenTransferCheckContract.setDataPart(toHex(data));
    return tokenTransferCheckContract;
  }

  public static getDummyInstance(checkType: TOKEN_TRANSFER_TYPE) {
    let v = this.tokenTransferTypeInfos.find((v) => v.type == checkType);
    let tokenInputArray = new Array(v.in).fill(0);
    let tokenOutputArray = new Array(v.out).fill({
      address: dummyAddress,
      tokenAmount: BN.Zero,
    });
    let contract = TokenTransferCheck.createContract(
      v.type,
      tokenInputArray,
      tokenOutputArray,
      dummyCodehash.toBuffer(),
      Buffer.from("0000000000000000000000000000000000000000", "hex")
    );
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
    let tokenContractInstance = Token.getDummyInstance();

    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
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
    let unlockedContract = this.unlock(
      contract,
      new SigHashPreimage(toHex(preimage)),
      new Bytes(tokenContractInstance.lockingScript.toHex()),
      new Bytes(toHex(prevouts)),
      new Bytes(toHex(checkRabinMsgArray)),
      new Bytes(toHex(checkRabinPaddingArray)),
      new Bytes(toHex(checkRabinSigArray)),
      rabinPubKeyIndexArray,
      rabinPubKeyArray,
      new Bytes(toHex(dummyRabinPubKeyHashArray)),
      new Bytes(toHex(inputTokenAddressArray)),
      new Bytes(toHex(inputTokenAmountArray)),
      new Bytes(toHex(receiverSatoshiArray)),
      1000,
      new Ripemd160(toHex(dummyAddress.hashBuffer)),
      new Bytes(opreturnScriptHex)
    );
    return unlockedContract.toScript().toBuffer().length;
  }
}

export enum TOKEN_UNLOCK_CONTRACT_TYPE {
  IN_2_OUT_5 = 1,
  IN_4_OUT_8,
  IN_8_OUT_12,
  IN_3_OUT_100,
  IN_20_OUT_5,
  UNSUPPORT,
}
export class TokenUnlockContractCheck {
  public static getDesc(checkType: TOKEN_UNLOCK_CONTRACT_TYPE) {
    switch (checkType) {
      case TOKEN_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5:
        return require("./contract-desc/tokenUnlockContractCheck_desc.json");
      case TOKEN_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8:
        return require("./contract-desc/tokenUnlockContractCheck_4To8_desc.json");
      case TOKEN_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12:
        return require("./contract-desc/tokenUnlockContractCheck_8To12_desc.json");
      case TOKEN_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100:
        return require("./contract-desc/tokenUnlockContractCheck_3To100_desc.json");
      case TOKEN_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5:
        return require("./contract-desc/tokenUnlockContractCheck_20To5_desc.json");
      default:
        throw "invalid checkType";
    }
  }
  public static getClass(checkType: TOKEN_UNLOCK_CONTRACT_TYPE) {
    return buildContractClass(this.getDesc(checkType));
  }

  public static getOptimumType(inCount: number, outCount: number) {
    if (inCount <= 2 && outCount <= 5) {
      return TOKEN_UNLOCK_CONTRACT_TYPE.IN_2_OUT_5;
    } else if (inCount <= 4 && outCount <= 8) {
      return TOKEN_UNLOCK_CONTRACT_TYPE.IN_4_OUT_8;
    } else if (inCount <= 8 && outCount <= 12) {
      return TOKEN_UNLOCK_CONTRACT_TYPE.IN_8_OUT_12;
    } else if (inCount <= 20 && outCount <= 5) {
      return TOKEN_UNLOCK_CONTRACT_TYPE.IN_20_OUT_5;
    } else if (inCount <= 3 && outCount <= 100) {
      return TOKEN_UNLOCK_CONTRACT_TYPE.IN_3_OUT_100;
    } else {
      return TOKEN_UNLOCK_CONTRACT_TYPE.UNSUPPORT;
    }
  }
  public static unlock(
    instance: any,
    txPreimage: SigHashPreimage,
    tokenScript: Bytes,
    prevouts: Bytes,
    rabinMsgArray: Bytes,
    rabinPaddingArray: Bytes,
    rabinSigArray: Bytes,
    rabinPubKeyIndexArray: number[],
    rabinPubKeyVerifyArray: bigint | string[],
    rabinPubKeyHashArray: Bytes,
    inputTokenAddressArray: Bytes,
    inputTokenAmountArray: Bytes,
    nOutputs: number,
    tokenOutputIndexArray: Bytes,
    tokenOutputSatoshiArray: Bytes,
    otherOutputArray: Bytes
  ) {
    return instance.unlock(
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
    );
  }
}
