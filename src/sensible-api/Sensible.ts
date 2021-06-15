import { Net } from "../net";
import {
  API_NET,
  FungibleTokenUnspent,
  NonFungibleTokenUnspent,
  SensibleApiBase,
} from "./index";
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
export class Sensible implements SensibleApiBase {
  serverBase: string;
  constructor(apiNet: API_NET) {
    if (apiNet == API_NET.MAIN) {
      this.serverBase = "https://api.sensiblequery.com";
    } else {
      this.serverBase = "https://api.sensiblequery.com/test";
    }
  }

  public authorize(options: any) {}
  /**
   * @param {string} address
   */
  public async getUnspents(
    address: string
  ): Promise<
    {
      txId: string;
      outputIndex: number;
      satoshis: number;
      address: string;
    }[]
  > {
    let url = `${this.serverBase}/address/${address}/utxo`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    let ret = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      outputIndex: v.vout,
      satoshis: v.satoshi,
      address: address,
    }));
    return ret;
  }

  /**
   * @param {string} hex
   */
  public async broadcast(
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
  public async getRawTxData(txid: string): Promise<string> {
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
  public async getFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string,
    size: number = 10
  ): Promise<FungibleTokenUnspent[]> {
    let url = `${this.serverBase}/ft/utxo/${codehash}/${genesis}/${address}?size=${size}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) return [];
    let ret: FungibleTokenUnspent[] = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      outputIndex: v.vout,
      tokenAddress: address,
      tokenAmount: v.tokenAmount,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的余额
   */
  public async getFungibleTokenBalance(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<{
    balance: number;
    pendingBalance: number;
    utxoCount: number;
    decimal: number;
  }> {
    let url = `${this.serverBase}/ft/balance/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data;
  }

  /**
   * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  public async getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<NonFungibleTokenUnspent[]> {
    let url = `${this.serverBase}/nft/utxo/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    if (!data) return [];
    let ret: NonFungibleTokenUnspent[] = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      outputIndex: v.vout,
      tokenAddress: address,
      tokenId: v.tokenId,
      metaTxId: v.metaTxId,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  public async getNonFungibleTokenUnspentDetail(
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
      outputIndex: v.vout,
      tokenAddress: v.address,
      tokenId: v.tokenId,
      metaTxId: v.metaTxId,
    }))[0];
    return ret;
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   */
  public async getFungibleTokenSummary(
    address: string
  ): Promise<{
    codehash: string;
    genesis: string;
    pendingBalance: number;
    balance: number;
    symbol: string;
    decimal: number;
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
  public async getNonFungibleTokenSummary(
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
