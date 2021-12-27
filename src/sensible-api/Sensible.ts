import { CodeError, ErrCode } from "../common/error";
import { Net } from "../net";
import {
  API_NET,
  API_TARGET,
  AuthorizationOption,
  FungibleTokenBalance,
  FungibleTokenSummary,
  FungibleTokenUnspent,
  NonFungibleTokenSummary,
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
  tokenIndex?: string;
  txid?: string;
  vout?: number;
  metaTxId?: string;
  metaOutputIndex?: number;
};
export class Sensible implements SensibleApiBase {
  serverBase: string;
  constructor(apiTarget: API_TARGET, apiNet: API_NET) {
    if (apiTarget == API_TARGET.SENSIBLE) {
      if (apiNet == API_NET.MAIN) {
        this.serverBase = "https://api.sensiblequery.com";
      } else {
        this.serverBase = "https://api.sensiblequery.com/test";
      }
    } else if (apiTarget == API_TARGET.SHOW) {
      if (apiNet == API_NET.MAIN) {
        this.serverBase = "https://sensiblequery.show.sv";
      } else {
        throw new CodeError(
          ErrCode.EC_SENSIBLE_API_ERROR,
          "show only support mainnet"
        );
      }
    }
  }

  public authorize(options: AuthorizationOption) {}
  /**
   * @param {string} address
   */
  public async getUnspents(address: string): Promise<
    {
      txId: string;
      outputIndex: number;
      satoshis: number;
      address: string;
    }[]
  > {
    let url = `${this.serverBase}/address/${address}/utxo?size=100`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
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
        throw new CodeError(
          ErrCode.EC_SENSIBLE_API_ERROR,
          `request api failed. [url]:${url} [msg]:${msg}`
        );
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
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
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
    size: number = 20
  ): Promise<FungibleTokenUnspent[]> {
    let url = `${this.serverBase}/ft/utxo/${codehash}/${genesis}/${address}?size=${size}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
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
  ): Promise<FungibleTokenBalance> {
    let url = `${this.serverBase}/ft/balance/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }

    let ret: FungibleTokenBalance = {
      balance: data.balance.toString(),
      pendingBalance: data.pendingBalance.toString(),
      utxoCount: data.utxoCount,
      decimal: data.decimal,
    };

    return ret;
  }

  /**
   * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  public async getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string,
    cursor: number = 0,
    size: number = 100
  ): Promise<NonFungibleTokenUnspent[]> {
    let url = `${this.serverBase}/nft/utxo/${codehash}/${genesis}/${address}?cursor=${cursor}&size=${size}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }

    if (!data) return [];
    let ret: NonFungibleTokenUnspent[] = data.map((v: SensibleQueryUtxo) => ({
      txId: v.txid,
      outputIndex: v.vout,
      tokenAddress: address,
      tokenIndex: v.tokenIndex,
      metaTxId: v.metaTxId,
      metaOutputIndex: v.metaOutputIndex,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  public async getNonFungibleTokenUnspentDetail(
    codehash: string,
    genesis: string,
    tokenIndex: string
  ) {
    let url = `${this.serverBase}/nft/utxo-detail/${codehash}/${genesis}/${tokenIndex}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    if (!data) return null;
    let ret = [data].map((v) => ({
      txId: v.txid,
      outputIndex: v.vout,
      tokenAddress: v.address,
      tokenIndex: v.tokenIndex,
      metaTxId: v.metaTxId,
      metaOutputIndex: v.metaOutputIndex,
    }))[0];
    return ret;
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   */
  public async getFungibleTokenSummary(
    address: string
  ): Promise<FungibleTokenSummary[]> {
    let url = `${this.serverBase}/ft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    let ret: FungibleTokenSummary[] = [];
    data.forEach((v) => {
      ret.push({
        codehash: v.codehash,
        genesis: v.genesis,
        sensibleId: v.sensibleId,
        pendingBalance: v.pendingBalance.toString(),
        balance: v.balance.toString(),
        symbol: v.symbol,
        decimal: v.decimal,
      });
    });
    return ret;
  }

  /**
   * 查询某人持有的所有NFT Token列表。获得持有的nft数量计数
   * @param {String} address
   * @returns
   */
  public async getNonFungibleTokenSummary(
    address: string
  ): Promise<NonFungibleTokenSummary[]> {
    let url = `${this.serverBase}/nft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }

    let ret: NonFungibleTokenSummary[] = [];
    if (data) {
      data.forEach((v) => {
        ret.push({
          codehash: v.codehash,
          genesis: v.genesis,
          sensibleId: v.sensibleId,
          count: v.count,
          pendingCount: v.pendingCount,
          metaTxId: v.metaTxId,
          metaOutputIndex: v.metaOutputIndex,
          supply: v.supply,
        });
      });
    }

    return ret;
  }

  public async getBalance(address: string) {
    let url = `${this.serverBase}/address/${address}/balance`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    return {
      balance: data.satoshi,
      pendingBalance: data.pendingSatoshi,
    };
  }

  public async getNftSellUtxo(
    codehash: string,
    genesis: string,
    tokenIndex: string
  ) {
    let url = `${this.serverBase}/nft/sell/utxo-detail/${codehash}/${genesis}/${tokenIndex}?isReadyOnly=true`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    if (!data) return null;
    let ret = data
      .filter((v) => v.isReady == true)
      .map((v) => ({
        codehash,
        genesis,
        tokenIndex,
        txId: v.txid,
        outputIndex: v.vout,
        sellerAddress: v.address,
        satoshisPrice: v.price,
      }))[0];
    return ret;
  }

  public async getNftSellList(
    codehash: string,
    genesis: string,
    cursor: number = 0,
    size: number = 20
  ) {
    let url = `${this.serverBase}/nft/sell/utxo/${codehash}/${genesis}?cursor=${cursor}&size=${size}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    if (!data) return null;
    let ret = data.map((v) => ({
      codehash,
      genesis,
      tokenIndex: v.tokenIndex,
      txId: v.txid,
      outputIndex: v.vout,
      sellerAddress: v.address,
      satoshisPrice: v.price,
    }));
    return ret;
  }

  public async getNftSellListByAddress(
    address: string,
    cursor: number = 0,
    size: number = 20
  ) {
    let url = `${this.serverBase}/nft/sell/utxo-by-address/${address}?cursor=${cursor}&size=${size}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }
    if (!data) return null;
    let ret = data.map((v) => ({
      codehash: v.codehash,
      genesis: v.genesis,
      tokenIndex: v.tokenIndex,
      txId: v.txid,
      outputIndex: v.vout,
      sellerAddress: v.address,
      satoshisPrice: v.price,
    }));
    return ret;
  }

  public async getOutpointSpent(txId: string, index: number) {
    let url = `${this.serverBase}/tx/${txId}/out/${index}/spent`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      return null;
    }
    if (!data) return null;
    return {
      spentTxId: data.txid,
      spentInputIndex: data.idx,
    };
  }
}
