import * as BN from "../src/bn.js/index.js";
import * as bsv from "../src/bsv";
import { SatotxSigner } from "../src/common/SatotxSigner";
import * as rabin from "./rabin";

export class MockSatotxSigner extends SatotxSigner {
  satotxApiPrefix: string;
  satotxPubKey?: BN;
  p: BN;
  q: BN;
  nRabin: BN;

  constructor(p: BN, q: BN, satotxApiPrefix?: string, satotxPubKey?: string) {
    super(satotxApiPrefix, satotxPubKey);
    if (!p) {
      let _res = rabin.generatePrivKey();
      p = _res.p;
      q = _res.q;
    }

    let nRabin = rabin.privKeyToPubKey(p, q);
    this.satotxPubKey = nRabin;
    this.p = p;
    this.q = q;
    this.nRabin = nRabin;
  }

  async satoTxSigUTXOSpendBy({
    index,
    txId,
    txHex,
    byTxId,
  }: {
    index: number;
    txId: string;
    txHex: string;
    byTxId: string;
  }): Promise<{
    txId: string;
    index: number;
    byTxId: string;
    sigBE: string;
    sigLE: string;
    padding: string;
    payload: string;
  }> {
    let tx = new bsv.Transaction(txHex);
    let buf1 = Buffer.from(txId, "hex").reverse();
    let buf2 = Buffer.alloc(4);
    buf2.writeInt32LE(index);
    let buf3 = Buffer.alloc(8);
    buf3.writeInt32LE(tx.outputs[index].satoshis);
    let buf4 = bsv.crypto.Hash.sha256ripemd160(
      tx.outputs[index].script.toBuffer()
    );
    let buf5 = Buffer.from(byTxId, "hex").reverse();
    let payloadMsg = Buffer.concat([buf1, buf2, buf3, buf4, buf5]);
    let payload = payloadMsg.toString("hex");
    let { signature, padding } = rabin.sign(
      payload,
      this.p,
      this.q,
      this.nRabin
    );

    let result = {
      txId: txId,
      index: index,
      sigBE: signature.toString("hex"),
      sigLE: signature.toBuffer().reverse().toString("hex"),
      padding,
      payload,
      byTxId,
    };

    return result;
  }

  async satoTxSigUTXOSpendByUTXO({
    index,
    txId,
    txHex,
    byTxIndex,
    byTxId,
    byTxHex,
  }: {
    index: number;
    txId: string;
    txHex: string;
    byTxIndex: number;
    byTxId: string;
    byTxHex: string;
  }): Promise<{
    txId: string;
    index: number;
    sigBE: string;
    sigLE: string;
    padding: string;
    payload: string;
    byTxId: string;
    byTxIndex: number;
    byTxSigBE: string;
    byTxSigLE: string;
    byTxPadding: string;
    byTxPayload: string;
    byTxScript: string;
  }> {
    let tx = new bsv.Transaction(txHex);
    let byTx = new bsv.Transaction(byTxHex);
    let payload = "";
    let result1, result2;
    {
      let buf1 = Buffer.from(txId, "hex").reverse();
      let buf2 = Buffer.alloc(4);
      buf2.writeInt32LE(index);
      let buf3 = Buffer.alloc(8);
      buf3.writeInt32LE(tx.outputs[index].satoshis);
      let buf4 = bsv.crypto.Hash.sha256ripemd160(
        tx.outputs[index].script.toBuffer()
      );
      let buf5 = Buffer.from(byTxId, "hex").reverse();
      let payloadMsg = Buffer.concat([buf1, buf2, buf3, buf4, buf5]);
      payload = payloadMsg.toString("hex");
      let { signature, padding } = rabin.sign(
        payload,
        this.p,
        this.q,
        this.nRabin
      );

      result1 = {
        txId: txId,
        index: index,
        sigBE: signature.toString("hex"),
        sigLE: signature.toBuffer().reverse().toString("hex"),
        padding,
        payload,
      };
    }

    {
      let buf1 = Buffer.from(byTxId, "hex").reverse();
      let buf2 = Buffer.alloc(4);
      buf2.writeInt32LE(byTxIndex);
      let buf3 = Buffer.alloc(8);
      buf3.writeInt32LE(byTx.outputs[byTxIndex].satoshis);
      let buf4 = bsv.crypto.Hash.sha256ripemd160(
        byTx.outputs[byTxIndex].script.toBuffer()
      );
      let payloadMsg = Buffer.concat([buf1, buf2, buf3, buf4]);
      payload = payloadMsg.toString("hex");
      let { signature, padding } = rabin.sign(
        payload,
        this.p,
        this.q,
        this.nRabin
      );
      result2 = {
        byTxId,
        byTxIndex,
        byTxSigBE: signature.toString("hex"),
        byTxSigLE: signature.toBuffer().reverse().toString("hex"),
        byTxPadding: padding,
        byTxPayload: payload,
      };
    }

    let ret = Object.assign(result1, result2);
    return ret;
  }
}
