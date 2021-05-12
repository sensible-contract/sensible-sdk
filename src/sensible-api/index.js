const { Net } = require("../net");
const { API_NET } = require("./common");
class SensibleApi {
  constructor(apiNet) {
    if (apiNet == API_NET.MAIN) {
      this.serverBase = "https://api.sensiblequery.com";
    } else {
      this.serverBase = "https://api.sensiblequery.com/test";
    }
  }

  /**
   * @param {string} address
   */
  async getUnspents(address) {
    let url = `${this.serverBase}/address/${address}/utxo`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    let ret = data.map((v) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
    }));
    return ret;
  }

  /**
   * @param {string} hex
   */
  async broadcast(txHex) {
    let url = `${this.serverBase}/pushtx`;
    let { code, data, msg } = await Net.httpPost(url, {
      txHex,
    });
    if (code != 0) {
      console.log(txHex);
      throw { title: "request sensible api failed", url, msg };
    }
    return data;
  }

  /**
   * @param {string} txid
   */
  async getRawTxData(txid) {
    let url = `${this.serverBase}/rawtx/${txid}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) {
      console.log("getRawfailed", url);
    }
    return data;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  async getFungbleTokenUnspents(codehash, genesis, address) {
    let url = `${this.serverBase}/ft/utxo/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }
    if (!data) return [];
    let ret = data.map((v) => ({
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
  async getFungbleTokenBalance(codehash, genesis, address) {
    let url = `${this.serverBase}/ft/balance/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    return data.balance;
  }

  /**
   * 获取指定交易的FT输出信息
   */
  async getOutputFungbleToken(txid, index) {
    let url = `${this.serverBase}/tx/${txid}/out/${index}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
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
   * 查询某人持有的某FT的UTXO
   */
  async getNonFungbleTokenUnspents(codehash, genesis, address) {
    let url = `${this.serverBase}/nft/utxo/${codehash}/${genesis}/${address}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
    if (code != 0) {
      throw { title: "request sensible api failed", url, msg };
    }

    if (!data) return [];
    let ret = data.map((v) => ({
      txId: v.txid,
      satoshis: v.satoshi,
      outputIndex: v.vout,
      rootHeight: 0,
      lockingScript: v.scriptPk,
      tokenAddress: address,
      tokenId: v.tokenId,
    }));
    return ret;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  async getNonFungbleTokenUnspentDetail(codehash, genesis, tokenid) {
    let url = `${this.serverBase}/nft/utxo-detail/${codehash}/${genesis}/${tokenid}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
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
    }))[0];
    return ret;
  }

  async getOutputNonFungbleToken(txid, index) {
    let url = `${this.serverBase}/tx/${txid}/out/${index}`;
    let _res = await Net.httpGet(url, {});
    const { code, data, msg } = _res;
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
}

module.exports = { SensibleApi };
