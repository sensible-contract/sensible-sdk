import * as BN from "../../bn.js";
import * as bsv from "../../bsv";
import { ContractAdapter } from "../../common/ContractAdapter";
import {
  dummyAddress,
  dummyPadding,
  dummyPayload,
  dummyPk,
  dummyRabinPubKey,
  dummyRabinPubKeyHashArray,
  dummySigBE,
  dummyTx,
} from "../../common/dummy";
import { PROTO_TYPE } from "../../common/protoheader";
import { PLACE_HOLDER_SIG } from "../../common/utils";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  Int,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import * as ftProto from "../contract-proto/token.proto";
import { TokenFactory } from "./token";
const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";
export class TokenGenesis extends ContractAdapter {
  private constuctParams: {
    pubKey: bsv.PublicKey;
  };
  private _formatedDataPart: ftProto.FormatedDataPart;

  constructor(constuctParams: { pubKey: bsv.PublicKey }) {
    let desc = require("../contract-desc/tokenGenesis_desc.json");
    let ClassObj = buildContractClass(desc);
    let contract = new ClassObj(new PubKey(toHex(constuctParams.pubKey)));
    super(contract);

    this.constuctParams = constuctParams;
    this._formatedDataPart = {};
  }

  clone() {
    let contract = new TokenGenesis(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: ftProto.FormatedDataPart): void {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    this._formatedDataPart.genesisHash = "";
    this._formatedDataPart.genesisFlag = ftProto.GENESIS_FLAG.TRUE;
    this._formatedDataPart.protoVersion = ftProto.PROTO_VERSION;
    this._formatedDataPart.protoType = PROTO_TYPE.FT;
    super.setDataPart(toHex(ftProto.newDataPart(this._formatedDataPart)));
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public setFormatedDataPartFromLockingScript(script: bsv.Script) {
    let dataPart = ftProto.parseDataPart(script.toBuffer());
    this.setFormatedDataPart(dataPart);
  }

  public isFirstGenesis() {
    return this.getFormatedDataPart().sensibleID.txid == genesisTokenIDTxid;
  }

  public unlock({
    txPreimage,
    sig,
    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinPubKeyHashArray,
    genesisSatoshis,
    tokenScript,
    tokenSatoshis,
    changeAddress,
    changeSatoshis,
    opReturnScript,
  }: {
    txPreimage: SigHashPreimage;
    sig: Sig;
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinPubKeyHashArray: Bytes;
    genesisSatoshis: number;
    tokenScript: Bytes;
    tokenSatoshis: number;
    changeAddress: Ripemd160;
    changeSatoshis: number;
    opReturnScript: Bytes;
  }) {
    return this._contract.unlock(
      txPreimage,
      sig,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray,
      genesisSatoshis,
      tokenScript,
      tokenSatoshis,
      changeAddress,
      changeSatoshis,
      opReturnScript
    ) as FunctionCall;
  }
}

export class TokenGenesisFactory {
  public static lockingScriptSize: number;

  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  /**
   * create genesis contract
   * @param {Object} issuerPubKey issuer public key used to unlocking genesis contract
   * @param {string} tokenName the token name
   * @param {string} tokenSymbol the token symbol
   * @param {number} decimalNum the token amount decimal number
   * @returns
   */
  public static createContract(issuerPubKey: bsv.PublicKey) {
    return new TokenGenesis({ pubKey: issuerPubKey });
  }

  public static getDummyInstance() {
    let contract = this.createContract(dummyPk);
    contract.setFormatedDataPart({});
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
    let tokenContract = TokenFactory.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(PLACE_HOLDER_SIG, "hex");
    const rabinMsg = dummyPayload;
    const rabinPaddingArray = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray = [];
    const rabinPubKeyVerifyArray: Int[] = [];
    for (let i = 0; i < ftProto.SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyVerifyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    let unlockResult = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      sig: new Sig(toHex(sig)),
      rabinMsg: new Bytes(toHex(rabinMsg)),
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
      genesisSatoshis: 1000,
      tokenScript: new Bytes(tokenContract.lockingScript.toHex()),
      tokenSatoshis: 1000,
      changeAddress: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeSatoshis: 1000,
      opReturnScript: new Bytes(opreturnScriptHex),
    });
    return (unlockResult.toScript() as bsv.Script).toBuffer().length;
  }
}
