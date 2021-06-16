import { bsv } from "scryptlib";
import { Net } from "../net";
import {
  API_NET,
  FungibleTokenUnspent,
  NonFungibleTokenUnspent,
  SA_utxo,
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
export class MetaSV implements SensibleApiBase {
  serverBase: string;
  authorization: string;
  privateKey: any;
  publicKey: any;
  constructor(apiNet: API_NET) {
    if (apiNet == API_NET.MAIN) {
      this.serverBase = "https://apiv2.metasv.com";
    } else {
      throw "metasv only support mainnet";
    }
  }

  public authorize(options: any) {
    const { authorization, privateKey } = options;

    if (authorization) {
      if (authorization.indexOf("Bearer") != 0) {
        this.authorization = `Bearer ${authorization}`;
      } else {
        this.authorization = authorization;
      }
    } else {
      //https://github.com/metasv/metasv-client-signature
      this.privateKey = new bsv.PrivateKey(privateKey);
      this.publicKey = this.privateKey.toPublicKey();
    }
  }

  private _getHeaders(path: string) {
    let headers = {};
    if (this.authorization) {
      headers = { authorization: this.authorization };
    } else if (this.privateKey) {
      const timestamp = Date.now();
      const nonce = Math.random().toString().substr(2, 10);
      const message = path + "_" + timestamp + "_" + nonce;
      const hash = bsv.crypto.Hash.sha256(Buffer.from(message));
      const sig = bsv.crypto.ECDSA.sign(hash, this.privateKey);
      const sigEncoded = sig.toBuffer().toString("base64");

      headers = {
        "MetaSV-Timestamp": timestamp,
        "MetaSV-Client-Pubkey": this.publicKey.toHex(),
        "MetaSV-Nonce": nonce,
        "MetaSV-Signature": sigEncoded,
      };
    } else {
      throw "MetaSV should be authorized to access api.";
    }
    return headers;
  }

  /**
   * @param {string} address
   */
  public async getUnspents(address: string): Promise<SA_utxo[]> {
    let url = `${this.serverBase}/address/${address}/utxo`;
    let _res: any = await Net.httpGet(url, {});

    let ret: SA_utxo[] = _res.map((v: any) => ({
      txId: v.txid,
      outputIndex: v.outIndex,
      satoshis: v.value,
      address: address,
    }));
    return ret;
  }

  /**
   * @param {string} hex
   */
  public async broadcast(hex: string): Promise<string> {
    let url = `${this.serverBase}/tx/broadcast`;
    let _res: any = await Net.httpPost(url, {
      hex,
    });
    return _res.txid;
  }

  /**
   * @param {string} txid
   */
  public async getRawTxData(txid: string): Promise<string> {
    let url = `${this.serverBase}/tx/${txid}/raw`;
    let _res: any = await Net.httpGet(url, {});
    return _res.hex;
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
    let path = `/sensible/ft/address/${address}/utxo`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      {
        codeHash: codehash,
        genesis,
      },
      {
        headers: this._getHeaders(path),
      }
    );

    let ret: FungibleTokenUnspent[] = _res.map((v) => ({
      txId: v.txid,
      outputIndex: v.txIndex,
      tokenAddress: address,
      tokenAmount: v.value,
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
    let path = `/sensible/ft/address/${address}/balance`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      { codeHash: codehash, genesis },
      { headers: this._getHeaders(path) }
    );

    let data = _res.map((v) => ({
      balance: v.confirmed,
      pendingBalance: v.unconfirmed,
      utxoCount: 1,
      decimal: v.decimal,
    }));
    return data[0];
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
    let path = `/sensible/ft/address/${address}/balance`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      {},
      { headers: this._getHeaders(path) }
    );

    let data = _res.map((v) => ({
      codehash: v.codeHash,
      genesis: v.genesis,
      symbol: v.symbol,
      decimal: v.decimal,
      balance: v.confirmed,
      pendingBalance: v.unconfirmed,
    }));

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
    let url = `https://api.sensiblequery.com/nft/utxo/${codehash}/${genesis}/${address}`;
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
    let url = `https://api.sensiblequery.com/nft/utxo-detail/${codehash}/${genesis}/${tokenid}`;
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
    let url = `https://api.sensiblequery.com/nft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data;
  }
}
