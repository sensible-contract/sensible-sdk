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

function fixApiPrefix(api: string) {
  api = api.split(",")[0];
  if (api[api.length - 1] == "/") {
    api = api.slice(0, api.length - 1);
  }
  return api;
}

/**
 * 签名器API
 * https://github.com/sensible-contract/satotx
 */

export class SatotxSigner {
  satotxApiPrefix: string;
  satotxPubKey?: string;
  constructor(satotxApiPrefix: string, satotxPubKey?: string) {
    this.satotxApiPrefix = fixApiPrefix(satotxApiPrefix);
    this.satotxPubKey = satotxPubKey;
  }

  async getInfo(): Promise<{
    pubKey: string;
  }> {
    let _res = await Net.httpGet(
      `${this.satotxApiPrefix}`,
      {},
      {
        headers: {
          "Accept-Encoding": "gzip",
        },
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
  }): Promise<{
    txId: string;
    index: number;
    byTxId: string;
    sigBE: string;
    sigLE: string;
    padding: string;
    payload: string;
  }> {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by/${txId}/${index}/${byTxId}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      },
      {
        headers: {
          "Accept-Encoding": "gzip",
        },
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
  }): Promise<{
    txId: string;
    index: number;
    byTxId: string;
    sigBE: string;
    sigLE: string;
    padding: string;
    payload: string;
  }> {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo/${txId}/${index}`,
      {
        txHex: txHex,
      },
      {
        headers: {
          "Accept-Encoding": "gzip",
        },
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
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by-utxo/${txId}/${index}/${byTxId}/${byTxIndex}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      },
      {
        headers: {
          "Accept-Encoding": "gzip",
        },
      }
    );
    const { code, msg, data } = _res as ResData;
    if (code != 0) {
      throw msg;
    }

    return data;
  }
}
