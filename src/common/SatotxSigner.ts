import { Net } from "../net";

type ResData = {
  code: number;
  data: any;
  msg: string;
};
export type SignerConfig = {
  satotxApiPrefix: string;
  satotxPubKey: string;
};
export class SatotxSigner {
  satotxApiPrefix: string;
  satotxPubKey: string;
  constructor(satotxApiPrefix: string, satotxPubKey: string) {
    this.satotxApiPrefix = satotxApiPrefix;
    this.satotxPubKey = satotxPubKey;
  }

  /**
   * @param {Object} satotxData
   * @param {number} satotxData.index utxo的vout
   * @param {Sha256} satotxData.txId 产生utxo的txid
   * @param {String} satotxData.txHex 产生utxo的rawtx
   * @param {Sha256} satotxData.byTxId 花费此utxo的txid
   * @param {String} satotxData.byTxHex 花费此utxo的rawtx
   */
  async satoTxSigUTXOSpendBy({
    index,
    txId,
    txHex,
    byTxId,
    byTxHex,
  }: {
    index: number;
    txId: string;
    txHex: string;
    byTxId: string;
    byTxHex: string;
  }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by/${txId}/${index}/${byTxId}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      }
    );
    const { code, msg, data } = _res as ResData;
    if (code != 0) {
      throw msg;
    }

    return data;
  }

  /**
   * @param {Object} satotxData
   * @param {number} satotxData.index utxo的vout
   * @param {Sha256} satotxData.txId 产生utxo的txid
   * @param {String} satotxData.txHex 产生utxo的rawtx
   */
  async satoTxSigUTXO({
    index,
    txId,
    txHex,
  }: {
    index: number;
    txId: string;
    txHex: string;
  }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo/${txId}/${index}`,
      {
        txHex: txHex,
      }
    );
    const { code, msg, data } = _res as ResData;
    if (code != 0) {
      throw msg;
    }
    return data;
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
  }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by-utxo/${txId}/${index}/${byTxId}/${byTxIndex}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      }
    );
    const { code, msg, data } = _res as ResData;
    if (code != 0) {
      throw msg;
    }

    return data;
  }
}
