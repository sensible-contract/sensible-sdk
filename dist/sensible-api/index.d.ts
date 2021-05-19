export declare enum API_NET {
    MAIN = "mainnet",
    TEST = "testnet"
}
export declare class SensibleApi {
    serverBase: string;
    constructor(apiNet: API_NET);
    /**
     * @param {string} address
     */
    getUnspents(address: string): Promise<any>;
    /**
     * @param {string} hex
     */
    broadcast(txHex: string): Promise<any>;
    /**
     * @param {string} txid
     */
    getRawTxData(txid: any): Promise<any>;
    /**
     * 通过FT合约CodeHash+溯源genesis获取某地址的utxo列表
     */
    getFungbleTokenUnspents(codehash: string, genesis: string, address: string): Promise<any>;
    /**
     * 查询某人持有的某FT的余额
     */
    getFungbleTokenBalance(codehash: string, genesis: string, address: string): Promise<any>;
    /**
     * 获取指定交易的FT输出信息
     */
    getOutputFungbleToken(txid: string, index: number): Promise<{
        txId: any;
        satoshis: any;
        outputIndex: any;
        rootHeight: number;
        lockingScript: any;
        tokenAddress: any;
        tokenAmount: any;
    }>;
    /**
     * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
     */
    getNonFungbleTokenUnspents(codehash: string, genesis: string, address: string): Promise<any>;
    /**
     * 查询某人持有的某FT的UTXO
     */
    getNonFungbleTokenUnspentDetail(codehash: string, genesis: string, tokenid: string): Promise<{
        txId: any;
        satoshis: any;
        outputIndex: any;
        rootHeight: number;
        lockingScript: any;
        tokenAddress: any;
        tokenId: any;
    }>;
    getOutputNonFungbleToken(txid: string, index: number): Promise<{
        txId: any;
        satoshis: any;
        outputIndex: any;
        rootHeight: number;
        lockingScript: any;
        tokenAddress: any;
        tokenId: any;
    }>;
    /**
     * 查询某人持有的FT Token列表。获得每个token的余额
     */
    getFungbleTokenSummary(address: string): Promise<any>;
    /**
     * 查询某人持有的所有NFT Token列表。获得持有的nft数量计数
     * @param {String} address
     * @returns
     */
    getNonFungbleTokenSummary(address: string): Promise<any>;
}
