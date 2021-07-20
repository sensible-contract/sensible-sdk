import * as TokenUtil from "./tokenUtil";
export class Prevouts {
  _buf: Buffer;
  constructor() {
    this._buf = Buffer.alloc(0);
  }

  addVout(txId: string, outputIndex: number) {
    const txidBuf = TokenUtil.getTxIdBuf(txId);
    const indexBuf = TokenUtil.getUInt32Buf(outputIndex);
    this._buf = Buffer.concat([this._buf, txidBuf, indexBuf]);
  }

  toHex() {
    return this._buf.toString("hex");
  }
}
