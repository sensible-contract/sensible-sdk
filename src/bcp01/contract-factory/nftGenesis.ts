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
import * as nftProto from "../contract-proto/nft.proto";
import { NftFactory } from "./nft";

const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";

export class NftGenesis extends ContractAdapter {
  constuctParams: { issuerPubKey: bsv.PublicKey };
  private _formatedDataPart: nftProto.FormatedDataPart;
  constructor(constuctParams: { issuerPubKey: bsv.PublicKey }) {
    const desc = require("../contract-desc/nftGenesis_desc.json");
    let GenesisContractClass = buildContractClass(desc);
    let contract = new GenesisContractClass(
      new PubKey(toHex(constuctParams.issuerPubKey))
    );
    super(contract);
    this.constuctParams = constuctParams;
  }

  clone() {
    let contract = new NftGenesis(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: nftProto.FormatedDataPart) {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    this._formatedDataPart.genesisHash = "";
    this._formatedDataPart.genesisFlag = nftProto.GENESIS_FLAG.TRUE;
    this._formatedDataPart.protoVersion = nftProto.PROTO_VERSION;
    this._formatedDataPart.protoType = PROTO_TYPE.NFT;
    super.setDataPart(toHex(nftProto.newDataPart(this._formatedDataPart)));
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public setFormatedDataPartFromLockingScript(script: bsv.Script) {
    let dataPart = nftProto.parseDataPart(script.toBuffer());
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
    nftScript,
    nftSatoshis,
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
    nftScript: Bytes;
    nftSatoshis: number;
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
      nftScript,
      nftSatoshis,
      changeAddress,
      changeSatoshis,
      opReturnScript
    ) as FunctionCall;
  }
}

export class NftGenesisFactory {
  public static lockingScriptSize: number;

  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static createContract(issuerPubKey: bsv.PublicKey): NftGenesis {
    return new NftGenesis({ issuerPubKey });
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
    let tokenContract = NftFactory.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(PLACE_HOLDER_SIG, "hex");
    const rabinMsg = dummyPayload;
    const rabinPaddingArray = [];
    const rabinSigArray: Int[] = [];
    const rabinPubKeyIndexArray = [];
    const rabinPubKeyArray: Int[] = [];
    for (let i = 0; i < nftProto.SIGNER_VERIFY_NUM; i++) {
      rabinPaddingArray.push(new Bytes(dummyPadding));
      rabinSigArray.push(new Int(BN.fromString(dummySigBE, 16).toString(10)));
      rabinPubKeyIndexArray.push(i);
      rabinPubKeyArray.push(new Int(dummyRabinPubKey.toString(10)));
    }

    let unlockResult = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      sig: new Sig(toHex(sig)),
      rabinMsg: new Bytes(toHex(rabinMsg)),
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray: rabinPubKeyArray,
      rabinPubKeyHashArray: new Bytes(toHex(dummyRabinPubKeyHashArray)),
      genesisSatoshis: 1000,
      nftScript: new Bytes(tokenContract.lockingScript.toHex()),
      nftSatoshis: 1000,
      changeAddress: new Ripemd160(toHex(dummyAddress.hashBuffer)),
      changeSatoshis: 1000,
      opReturnScript: new Bytes(opreturnScriptHex),
    });
    return (unlockResult.toScript() as bsv.Script).toBuffer().length;
  }
}
