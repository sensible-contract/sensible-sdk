import { BN } from "../../bn.js";
import * as bsv from "../../bsv";
import { ContractAdapter } from "../../common/ContractAdapter";
import {
  dummyAddress,
  dummyCodehash,
  dummyPk,
  dummyTx,
} from "../../common/dummy";
import { PROTO_TYPE } from "../../common/protoheader";
import { PLACE_HOLDER_SIG } from "../../common/utils";
import {
  buildContractClass,
  Bytes,
  FunctionCall,
  getPreimage,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  toHex,
} from "../../scryptlib";
import * as nftSellProto from "../contract-proto/nftSell.proto";
import { NftFactory } from "./nft";

export enum NFT_SELL_OP {
  SELL = 1,
  CANCEL = 2,
}
export class NftSell extends ContractAdapter {
  private _formatedDataPart: nftSellProto.FormatedDataPart;
  constuctParams: {
    senderAddress: Ripemd160;
    bsvRecAmount: number;
    nftCodeHash: Bytes;
    nftID: Bytes;
  };

  static getClass() {
    const desc = require("../contract-desc/nftSell_desc.json");
    let NftSellContractClass = buildContractClass(desc);
    return NftSellContractClass;
  }

  constructor(constuctParams: {
    senderAddress: Ripemd160;
    bsvRecAmount: number;
    nftCodeHash: Bytes;
    nftID: Bytes;
  }) {
    let NftSellContractClass = NftSell.getClass();
    let contract = new NftSellContractClass(
      constuctParams.senderAddress,
      constuctParams.bsvRecAmount,
      constuctParams.nftCodeHash,
      constuctParams.nftID
    );
    super(contract);
    this.constuctParams = constuctParams;
  }

  static fromASM(asm: string) {
    let NftSellContractClass = NftSell.getClass();
    let contract = NftSellContractClass.fromASM(asm);
    let params = contract.scriptedConstructor.params;
    let senderAddress = params[0];
    let bsvRecAmount = parseInt(params[1].value);
    let nftCodeHash = params[2];
    let nftID = params[3];
    return new NftSell({ senderAddress, bsvRecAmount, nftCodeHash, nftID });
  }

  clone() {
    let contract = new NftSell(this.constuctParams);
    contract.setFormatedDataPart(this.getFormatedDataPart());
    return contract;
  }

  public setFormatedDataPart(dataPart: nftSellProto.FormatedDataPart): void {
    this._formatedDataPart = Object.assign(
      {},
      this._formatedDataPart,
      dataPart
    );
    this._formatedDataPart.protoVersion = nftSellProto.PROTO_VERSION;
    this._formatedDataPart.protoType = PROTO_TYPE.NFT_SELL;
    super.setDataPart(toHex(nftSellProto.newDataPart(this._formatedDataPart)));
  }

  public getFormatedDataPart() {
    return this._formatedDataPart;
  }

  public setFormatedDataPartFromLockingScript(script: bsv.Script) {
    let dataPart = nftSellProto.parseDataPart(script.toBuffer());
    this.setFormatedDataPart(dataPart);
  }

  public unlock({
    txPreimage,
    nftScript, // only cancel need
    senderPubKey, // only cancel need
    senderSig, // only cancel need
    nftOutputSatoshis, // only cancel need
    op,
  }: {
    txPreimage: SigHashPreimage;
    nftScript?: Bytes;
    senderPubKey?: PubKey;
    senderSig?: Sig;
    nftOutputSatoshis?: number;
    op: NFT_SELL_OP;
  }) {
    if (op != NFT_SELL_OP.CANCEL) {
      nftScript = new Bytes("");
      senderPubKey = new PubKey("00");
      senderSig = new Sig("00");
      nftOutputSatoshis = 0;
    }

    return this._contract.unlock(
      txPreimage,
      nftScript,
      senderPubKey,
      senderSig,
      nftOutputSatoshis,
      op
    ) as FunctionCall;
  }
}

export class NftSellFactory {
  public static lockingScriptSize: number;

  public static getLockingScriptSize() {
    return this.lockingScriptSize;
  }

  public static createContract(
    senderAddress: Ripemd160,
    bsvRecAmount: number,
    nftCodeHash: Bytes,
    nftID: Bytes
  ): NftSell {
    return new NftSell({ senderAddress, bsvRecAmount, nftCodeHash, nftID });
  }

  public static createFromASM(asm: string): NftSell {
    return NftSell.fromASM(asm);
  }

  public static getDummyInstance() {
    let contract = this.createContract(
      new Ripemd160(toHex(dummyAddress.hashBuffer)),
      1000,
      new Bytes(toHex(Buffer.alloc(20, 0))),
      new Bytes(toHex(Buffer.alloc(36, 0)))
    );
    return contract;
  }
  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
    contract.setFormatedDataPart({
      codehash: toHex(dummyCodehash),
      genesis: toHex(dummyCodehash),
      tokenIndex: BN.fromString("10000000000", 10),
      sellerAddress: toHex(dummyAddress.hashBuffer),
      satoshisPrice: BN.fromString("100000000", 10),
      nftID: toHex(dummyCodehash),
    });
    let size = contract.lockingScript.toBuffer().length;
    return size;
  }

  public static calUnlockingScriptSize(op: NFT_SELL_OP) {
    let contract = this.getDummyInstance();
    let nftContract = NftFactory.getDummyInstance();
    const preimage = getPreimage(dummyTx, contract.lockingScript.toASM(), 1);
    const sig = Buffer.from(PLACE_HOLDER_SIG, "hex");

    let unlockResult = contract.unlock({
      txPreimage: new SigHashPreimage(toHex(preimage)),
      nftScript: new Bytes(nftContract.lockingScript.toHex()),
      senderPubKey: new PubKey(toHex(dummyPk)),
      senderSig: new Sig(toHex(sig)),
      nftOutputSatoshis: 1000,
      op,
    });
    return (unlockResult.toScript() as bsv.Script).toBuffer().length;
  }
}
