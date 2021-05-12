const { Net } = require("../net");
class SatotxSigner {
  constructor(satotxApiPrefix, satotxPubKey) {
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
  async satoTxSigUTXOSpendBy({ index, txId, txHex, byTxId, byTxHex }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by/${txId}/${index}/${byTxId}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      }
    );
    if (_res.code != 0) {
      throw _res.msg;
    }

    return _res.data;
  }

  /**
   * @param {Object} satotxData
   * @param {number} satotxData.index utxo的vout
   * @param {Sha256} satotxData.txId 产生utxo的txid
   * @param {String} satotxData.txHex 产生utxo的rawtx
   */
  async satoTxSigUTXO({ index, txId, txHex }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo/${txId}/${index}`,
      {
        txHex: txHex,
      }
    );
    if (_res.code == -1) {
      throw _res.msg;
    }
    return _res.data;
  }

  async satoTxSigUTXOSpendByUTXO({
    index,
    txId,
    txHex,
    byTxIndex,
    byTxId,
    byTxHex,
  }) {
    let _res = await Net.httpPost(
      `${this.satotxApiPrefix}/utxo-spend-by-utxo/${txId}/${index}/${byTxId}/${byTxIndex}`,
      {
        txHex: txHex,
        byTxHex: byTxHex,
      }
    );
    if (_res.code != 0) {
      throw _res.msg;
    }

    return _res.data;
  }
}

module.exports = {
  SatotxSigner,
};
