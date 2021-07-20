import { toHex } from "scryptlib";
import { TxContext } from "scryptlib/dist/contract";
import * as bsv from "../bsv";
export class ContractAdapter {
  _contract: any;
  constructor(contract: any) {
    this._contract = contract;
  }

  get lockingScript() {
    return this._contract.lockingScript as bsv.Script;
  }

  get txContext(): TxContext {
    return this._contract.txContext;
  }

  get dataPart() {
    return this._contract.dataPart as bsv.Script;
  }

  get codePart() {
    return this._contract.codePart as bsv.Script;
  }

  setTxContext(txContext: TxContext) {
    this._contract.txContext = txContext;
  }

  setDataPart(dataPart: string) {
    this._contract.setDataPart(dataPart);
  }

  //取OP_RETURN之前的hash
  getCodeHash() {
    let codePart = this.codePart.toBuffer();
    return toHex(bsv.crypto.Hash.sha256ripemd160(codePart));
  }

  //取整体的hash
  getScriptHash() {
    return toHex(
      bsv.crypto.Hash.sha256ripemd160(this.lockingScript.toBuffer())
    );
  }
}
