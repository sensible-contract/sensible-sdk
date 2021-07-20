import * as bsv from "../../bsv";
import { ContractAdapter } from "../../common/ContractAdapter";
import { dummyAddress, dummyPk, dummyTx } from "../../common/dummy";
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
import { NftFactory } from "./nft";

export enum NFT_SELL_OP {
  SELL = 1,
  CANCEL = 2,
}
export class NftSell extends ContractAdapter {
  constuctParams: {
    senderAddress: bsv.Address;
    bsvRecAmount: number;
    nftCodeHash: Bytes;
    nftID: Bytes;
  };
  constructor(constuctParams: {
    senderAddress: bsv.Address;
    bsvRecAmount: number;
    nftCodeHash: Bytes;
    nftID: Bytes;
  }) {
    const desc = require("../contract-desc/nftSell_desc.json");
    let NftSellContractClass = buildContractClass(desc);
    let contract = new NftSellContractClass(
      new Ripemd160(toHex(constuctParams.senderAddress.hashBuffer)),
      constuctParams.bsvRecAmount,
      constuctParams.nftCodeHash,
      constuctParams.nftID
    );
    super(contract);
    this.constuctParams = constuctParams;
  }

  clone() {
    let nft = new NftSell(this.constuctParams);
    return nft;
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
      senderPubKey = new PubKey("");
      senderSig = new Sig("");
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
    senderAddress: bsv.Address,
    bsvRecAmount: number,
    nftCodeHash: Bytes,
    nftID: Bytes
  ): NftSell {
    return new NftSell({ senderAddress, bsvRecAmount, nftCodeHash, nftID });
  }

  public static getDummyInstance() {
    let contract = this.createContract(
      dummyAddress,
      1000,
      new Bytes(toHex(Buffer.alloc(20, 0))),
      new Bytes(toHex(Buffer.alloc(36, 0)))
    );
    return contract;
  }
  public static calLockingScriptSize() {
    let contract = this.getDummyInstance();
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
