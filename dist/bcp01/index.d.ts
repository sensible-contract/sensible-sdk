import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import { API_NET, SensibleApi } from "../sensible-api";
import { NonFungibleToken } from "./NonFungibleToken";
declare type ParamUtxo = {
    txId: string;
    outputIndex: number;
    satoshis: number;
    wif: string;
    address?: any;
};
export declare class SensibleNFT {
    signers: SatotxSigner[];
    feeb: number;
    network: API_NET;
    mock: boolean;
    purse: string;
    sensibleApi: SensibleApi;
    nft: NonFungibleToken;
    /**
     *
     * @param {Object} param0
     * @param {Array} param0.signers - 签名器
     * @param {Number=} param0.feeb
     * @param {String=} param0.network
     * @param {String=} param0.purse
     * @param {Boolean=} param0.mock
     */
    constructor({ signers, feeb, network, mock, purse, }: {
        signers: SignerConfig[];
        feeb: number;
        network: API_NET;
        mock: boolean;
        purse: string;
    });
    pretreatUtxos(utxos: ParamUtxo[]): Promise<{
        utxos: ParamUtxo[];
        utxoPrivateKeys: any[];
    }>;
    /**
     * 创世
     * @param {Object} param0
     * @param {String} param0.genesisWif 发行方私钥WIF
     * @param {String} param0.totalSupply 最大供应量
     * @param {String} param0.opreturnData 追加输出
     * @param {Array=} param0.utxos 手续费UTXO
     * @param {String=} param0.changeAddress 手续费找零地址
     * @returns {Object} {txid,genesis,codehash}
     */
    genesis({ genesisWif, totalSupply, opreturnData, utxos, changeAddress, }: {
        genesisWif: string;
        totalSupply: string | bigint;
        opreturnData: any;
        utxos?: ParamUtxo[];
        changeAddress?: any;
    }): Promise<{
        tx: any;
        txid: any;
        genesis: string;
        codehash: string;
    }>;
    _genesis({ genesisWif, totalSupply, opreturnData, utxos, utxoPrivateKeys, changeAddress, }: {
        genesisWif: string;
        totalSupply: bigint;
        opreturnData?: any;
        utxos?: ParamUtxo[];
        utxoPrivateKeys: any[];
        changeAddress?: any;
    }): Promise<{
        tx: any;
        txid: any;
        genesis: string;
        codehash: string;
    }>;
    /**
     *
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.genesisWif 创世的私钥
     * @param {String} param0.metaTxId NFTState
     * @param {String} param0.opreturnData 追加的OPRETURN
     * @param {String} param0.receiverAddress 接受者的地址
     * @param {Array=} param0.utxos 手续费UTXO
     * @param {String=} param0.changeAddress 手续费找零地址
     * @returns {Object} {txid,tokenid}
     */
    issue({ genesis, codehash, genesisWif, receiverAddress, metaTxId, opreturnData, utxos, changeAddress, }: {
        genesis: any;
        codehash: any;
        genesisWif: any;
        receiverAddress: any;
        metaTxId: any;
        opreturnData: any;
        utxos: any;
        changeAddress: any;
    }): Promise<{
        txid: any;
        tokenid: bigint;
    }>;
    /**
     *
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.genesisWif 创世的私钥
     * @param {String} param0.metaTxId NFTState
     * @param {String} param0.opreturnData 追加的OPRETURN
     * @param {String} param0.receiverAddress 接受者的地址
     * @param {Array=} param0.utxos 手续费UTXO
     * @param {String=} param0.changeAddress 手续费找零地址
     * @returns {Object} {txid,tokenid}
     */
    _issue({ genesis, codehash, genesisWif, receiverAddress, metaTxId, opreturnData, utxos, utxoPrivateKeys, changeAddress, }: {
        genesis: any;
        codehash: any;
        genesisWif: any;
        receiverAddress: any;
        metaTxId: any;
        opreturnData: any;
        utxos: any;
        utxoPrivateKeys: any;
        changeAddress: any;
    }): Promise<{
        txid: any;
        tokenid: bigint;
    }>;
    /**
     *
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.tokenid
     * @param {String} param0.senderWif
     * @param {String} param0.receiverAddress 接受者的地址
     * @param {Array=} param0.utxos 手续费UTXO
     * @param {String=} param0.changeAddress 手续费找零地址
     * @returns {Object} {txid}
     */
    transfer({ genesis, codehash, tokenid, senderWif, receiverAddress, opreturnData, utxos, changeAddress, }: {
        genesis: any;
        codehash: any;
        tokenid: any;
        senderWif: any;
        receiverAddress: any;
        opreturnData: any;
        utxos: any;
        changeAddress: any;
    }): Promise<{
        txid: any;
    }>;
    getSummary(address: any): Promise<any>;
    getGenesisEstimateFee({ opreturnData }: {
        opreturnData: any;
    }): Promise<number>;
    getIssueEstimateFee({ opreturnData }: {
        opreturnData: any;
    }): Promise<number>;
    getTransferEstimateFee({ opreturnData }: {
        opreturnData: any;
    }): Promise<number>;
}
export {};
