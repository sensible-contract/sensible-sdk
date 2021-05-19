export declare type SignerConfig = {
    satotxApiPrefix: string;
    satotxPubKey: string;
};
export declare class SatotxSigner {
    satotxApiPrefix: string;
    satotxPubKey: string;
    constructor(satotxApiPrefix: string, satotxPubKey: string);
    /**
     * @param {Object} satotxData
     * @param {number} satotxData.index utxo的vout
     * @param {Sha256} satotxData.txId 产生utxo的txid
     * @param {String} satotxData.txHex 产生utxo的rawtx
     * @param {Sha256} satotxData.byTxId 花费此utxo的txid
     * @param {String} satotxData.byTxHex 花费此utxo的rawtx
     */
    satoTxSigUTXOSpendBy({ index, txId, txHex, byTxId, byTxHex, }: {
        index: number;
        txId: string;
        txHex: string;
        byTxId: string;
        byTxHex: string;
    }): Promise<any>;
    /**
     * @param {Object} satotxData
     * @param {number} satotxData.index utxo的vout
     * @param {Sha256} satotxData.txId 产生utxo的txid
     * @param {String} satotxData.txHex 产生utxo的rawtx
     */
    satoTxSigUTXO({ index, txId, txHex, }: {
        index: number;
        txId: string;
        txHex: string;
    }): Promise<any>;
    satoTxSigUTXOSpendByUTXO({ index, txId, txHex, byTxIndex, byTxId, byTxHex, }: {
        index: number;
        txId: string;
        txHex: string;
        byTxIndex: number;
        byTxId: string;
        byTxHex: string;
    }): Promise<any>;
}
