import { Net } from "../net";
export enum API_NET {
  MAIN = "mainnet",
  TEST = "testnet",
}

type ResData = {
  code: number;
  data: any;
  msg: string;
};

type SensibleQueryUtxo = {
  address?: string;
  codehash?: string;
  genesis?: string;
  height?: number;
  idx?: number;
  isNFT?: boolean;
  satoshi?: number;
  scriptPk?: string;
  scriptType?: string;
  tokenAmount?: number;
  tokenDecimal?: number;
  tokenId?: string;
  txid?: string;
  vout?: number;
  metaTxId?: string;
};
export class SensibleApi {
  serverBase: string;
  constructor(apiNet: API_NET) {
    if (apiNet == API_NET.MAIN) {
      this.serverBase = "https://api.sensiblequery.com";
    } else {
      this.serverBase = "https://api.sensiblequery.com/test";
    }
  }

  /**
   * @param {string} address
   */
  async getUnspents(address: string) {
    let url = `${this.serverBase}/address/${address}/utxo`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    let ret = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
    }));
    return ret;
  }

  /**
   * @param {string} hex
   */
  async broadcast(
    txHex: string,
    apiTarget: string = "sensible"
  ): Promise<string> {
    if (apiTarget == "metasv") {
      let _res: any = await Net.httpPost(
        "https://apiv2.metasv.com/tx/broadcast",
        {
          hex: txHex,
        }
      );
      return _res.txid;
    } else {
      let url = `${this.serverBase}/pushtx`;
      let _res = await Net.httpPost(url, {
        txHex,
      });
      const { code, data, msg } = _res as ResData;
      if (code != 0) {
        console.log(txHex);
        throw { title: "request sensible api failed", url, msg };
      }
      return data;
    }
  }

  /**
   * @param {string} txid
   */
  async getRawTxData(txid: string): Promise<string> {
    let url = `${this.serverBase}/rawtx/${txid}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) {
      console.log("getRawfailed", url);
    }
    return data;
  }

  /**
   * 通过FT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  async getFungbleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ) {
    let url = `${this.serverBase}/ft/utxo/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) return [];
    let ret = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
      rootHeight: 0,
      lockingScript: v.scriptPk,
      tokenAddress: address,
      tokenAmount: v.tokenAmount,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的余额
   */
  async getFungbleTokenBalance(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<{ balance: number; pendingBalance: number; utxoCount: number }> {
    let url = `${this.serverBase}/ft/balance/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data;
  }

  /**
   * 获取指定交易的FT输出信息
   */
  async getOutputFungbleToken(txid: string, index: number) {
    let url = `${this.serverBase}/tx/${txid}/out/${index}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    let ret = {
      txId: data.txid,
      satoshis: data.satoshi,
      outputIndex: data.vout,
      rootHeight: 0,
      lockingScript: data.scriptPk,
      tokenAddress: data.address,
      tokenAmount: data.tokenAmount,
    };
    return ret;
  }

  /**
   * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  async getNonFungbleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ) {
    let url = `${this.serverBase}/nft/utxo/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    if (!data) return [];
    let ret = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
      rootHeight: 0,
      lockingScript: v.scriptPk,
      tokenAddress: address,
      tokenId: v.tokenId,
      metaTxId: v.metaTxId,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  async getNonFungbleTokenUnspentDetail(
    codehash: string,
    genesis: string,
    tokenid: string
  ) {
    let url = `${this.serverBase}/nft/utxo-detail/${codehash}/${genesis}/${tokenid}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) return null;
    let ret = [data].map((v) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
      rootHeight: 0,
      lockingScript: v.scriptPk,
      tokenAddress: v.address,
      tokenId: v.tokenId,
      metaTxId: v.metaTxId,
    }))[0];
    return ret;
  }

  async getOutputNonFungbleToken(txid: string, index: number) {
    let url = `${this.serverBase}/tx/${txid}/out/${index}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    let ret = {
      txId: data.txid,
      satoshis: data.satoshi,
      outputIndex: data.vout,
      rootHeight: 0,
      lockingScript: data.scriptPk,
      tokenAddress: data.address,
      tokenId: data.tokenId,
    };
    return ret;
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   */
  async getFungbleTokenSummary(
    address: string
  ): Promise<{
    codehash: string;
    genesis: string;
    pendingBalance: number;
    balance: number;
    symbol: string;
  }> {
    let url = `${this.serverBase}/ft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data;
  }

  /**
   * 查询某人持有的所有NFT Token列表。获得持有的nft数量计数
   * @param {String} address
   * @returns
   */
  async getNonFungbleTokenSummary(
    address: string
  ): Promise<{
    codehash: string;
    genesis: string;
    count: number;
    pendingCount: number;
    symbol: string;
  }> {
    let url = `${this.serverBase}/nft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data;
  }
}

module.exports = { SensibleApi };
