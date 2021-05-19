"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensibleApi = exports.API_NET = void 0;
const net_1 = require("../net");
var API_NET;
(function (API_NET) {
    API_NET["MAIN"] = "mainnet";
    API_NET["TEST"] = "testnet";
})(API_NET = exports.API_NET || (exports.API_NET = {}));
class SensibleApi {
    constructor(apiNet) {
        if (apiNet == API_NET.MAIN) {
            this.serverBase = "https://api.sensiblequery.com";
        }
        else {
            this.serverBase = "https://api.sensiblequery.com/test";
        }
    }
    /**
     * @param {string} address
     */
    async getUnspents(address) {
        let url = `${this.serverBase}/address/${address}/utxo`;
        let _res = await net_1.Net.httpGet(url, {});
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
        // let _res:any = await Net.httpPost(
        //   "https://apiv2.metasv.com/merchant/broadcast",
        //   {
        //     hex: txHex,
        //   }
        // );
        // return _res.txid;
        let url = `${this.serverBase}/pushtx`;
        let _res = await net_1.Net.httpPost(url, {
            txHex,
        });
        const { code, data, msg } = _res;
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
        let _res = await net_1.Net.httpGet(url, {});
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
     * 通过FT合约CodeHash+溯源genesis获取某地址的utxo列表
     */
    async getFungbleTokenUnspents(codehash, genesis, address) {
        let url = `${this.serverBase}/ft/utxo/${codehash}/${genesis}/${address}`;
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
        if (code != 0) {
            throw { title: "request sensible api failed", url, msg };
        }
        if (!data)
            return [];
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
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
        if (code != 0) {
            throw { title: "request sensible api failed", url, msg };
        }
        return data.balance + data.pending_balance;
    }
    /**
     * 获取指定交易的FT输出信息
     */
    async getOutputFungbleToken(txid, index) {
        let url = `${this.serverBase}/tx/${txid}/out/${index}`;
        let _res = await net_1.Net.httpGet(url, {});
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
     * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
     */
    async getNonFungbleTokenUnspents(codehash, genesis, address) {
        let url = `${this.serverBase}/nft/utxo/${codehash}/${genesis}/${address}`;
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
        if (code != 0) {
            throw { title: "request sensible api failed", url, msg };
        }
        if (!data)
            return [];
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
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
        if (code != 0) {
            throw { title: "request sensible api failed", url, msg };
        }
        if (!data)
            return null;
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
        let _res = await net_1.Net.httpGet(url, {});
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
    /**
     * 查询某人持有的FT Token列表。获得每个token的余额
     */
    async getFungbleTokenSummary(address) {
        let url = `${this.serverBase}/ft/summary/${address}`;
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
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
    async getNonFungbleTokenSummary(address) {
        let url = `${this.serverBase}/nft/summary/${address}`;
        let _res = await net_1.Net.httpGet(url, {});
        const { code, data, msg } = _res;
        if (code != 0) {
            throw { title: "request sensible api failed", url, msg };
        }
        return data;
    }
}
exports.SensibleApi = SensibleApi;
module.exports = { SensibleApi };
