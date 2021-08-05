import { bsv } from "scryptlib";
import { CodeError, ErrCode } from "../common/error";
import { Net } from "../net";
import {
  API_NET,
  AuthorizationOption,
  FungibleTokenBalance,
  FungibleTokenSummary,
  FungibleTokenUnspent,
  NonFungibleTokenSummary,
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
  tokenAmount?: string;
  tokenDecimal?: number;
  tokenIndex?: string;
  txid?: string;
  vout?: number;
  metaTxId?: string;
  metaOutputIndex?: number;
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
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        "metasv only support mainnet"
      );
    }
  }

  public authorize(options: AuthorizationOption) {
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
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        "MetaSV should be authorized to access api."
      );
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
      tokenAmount: v.valueString,
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
    let path = `/sensible/ft/address/${address}/balance`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      { codeHash: codehash, genesis },
      { headers: this._getHeaders(path) }
    );

    let ret: FungibleTokenBalance = {
      balance: "0",
      pendingBalance: "0",
      utxoCount: 0,
      decimal: 0,
    };
    if (_res.length > 0) {
      ret = {
        balance: _res[0].confirmedString,
        pendingBalance: _res[0].unconfirmedString,
        utxoCount: _res[0].utxoCount,
        decimal: _res[0].decimal,
      };
    }
    return ret;
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   */
  public async getFungibleTokenSummary(
    address: string
  ): Promise<FungibleTokenSummary[]> {
    let path = `/sensible/ft/address/${address}/balance`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      {},
      { headers: this._getHeaders(path) }
    );

    let data: FungibleTokenSummary[] = [];
    _res.forEach((v: any) => {
      data.push({
        codehash: v.codeHash,
        genesis: v.genesis,
        sensibleId: v.sensibleId,
        symbol: v.symbol,
        decimal: v.decimal,
        balance: v.confirmedString,
        pendingBalance: v.unconfirmedString,
      });
    });

    return data;
  }

  /**
   * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  public async getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string,
    cursor: number = 0,
    size: number = 20
  ): Promise<NonFungibleTokenUnspent[]> {
    let url = `https://api.sensiblequery.com/nft/utxo/${codehash}/${genesis}/${address}?cursor=${cursor}&size=${size}`;
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
    let url = `https://api.sensiblequery.com/nft/utxo-detail/${codehash}/${genesis}/${tokenIndex}`;
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
   * 查询某人持有的所有NFT Token列表。获得持有的nft数量计数
   * @param {String} address
   * @returns
   */
  public async getNonFungibleTokenSummary(
    address: string
  ): Promise<NonFungibleTokenSummary[]> {
    let url = `https://api.sensiblequery.com/nft/summary/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res as ResData;
    if (code != 0) {
      throw new CodeError(
        ErrCode.EC_SENSIBLE_API_ERROR,
        `request api failed. [url]:${url} [msg]:${msg}`
      );
    }

    let ret: NonFungibleTokenSummary[] = [];
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
    return ret;
  }

  public async getBalance(address: string) {
    let path = `/address/${address}/balance`;
    let url = this.serverBase + path;
    let _res: any = await Net.httpGet(
      url,
      {},
      {
        headers: this._getHeaders(path),
      }
    );
    return {
      balance: _res.confirmed,
      pendingBalance: _res.unconfirmed,
    };
  }

  public async getNftSellUtxo(
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
      codehash,
      genesis,
      tokenIndex,
      txId: v.txid,
      outputIndex: v.vout,
      sellerAddress: v.address,
      satoshisPrice: v.tokenIndex,
      nftID: v.metaTxId,
    }))[0];
    return ret;
  }
}
