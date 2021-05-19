import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import { API_NET, SensibleApi } from "../sensible-api";
import { FungibleToken } from "./FungibleToken";
/**

FT这里有三套genesis/codehash
1.第一个用于是发行的TokenGenesis（同一个私钥发行的一样，可根据3的genesis来尝试花费）
codehash:aa1d1d2612197246fc04223442f15603befd52e3
genesis:000000000000000000000000000000000000000000000000000000000000000000000000
2.用于增发时的TokenGenesis（同一个私钥发行的codehash一样，并根据3的genesis通过API查）
3.实际转移的FT（codehash独一无二）

创建FT后返回一个3的genesis/codehash对来标识一种FT。
 */
export declare class SensibleFT {
    signers: SatotxSigner[];
    feeb: number;
    network: API_NET;
    mock: boolean;
    purse: string;
    sensibleApi: SensibleApi;
    zeroAddress: string;
    ft: FungibleToken;
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
    /**
     * genesis
     * @param {Object} param0
     * @param {String} param0.tokenName
     * @param {String} param0.tokenSymbol
     * @param {Number} param0.decimalNum
     * @param {String} param0.genesisWif
     * @param {Array=} param0.utxos
     * @param {String=} param0.changeAddress
     * @returns
     */
    genesis({ tokenName, tokenSymbol, decimalNum, genesisWif, utxos, changeAddress, opreturnData, }: {
        tokenName: string;
        tokenSymbol: string;
        decimalNum: number;
        genesisWif: string;
        utxos: any;
        changeAddress: any;
        opreturnData?: any;
    }): Promise<{
        tx: any;
        txid: any;
        genesis: any;
        codehash: any;
    }>;
    /**
     * token 发行
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.genesisWif
     * @param {String} param0.receiverAddress
     * @param {String} param0.tokenAmount
     * @param {Boolean} param0.allowIncreaseIssues
     * @param {Array=} param0.utxos
     * @param {String=} param0.changeAddress
     * @returns
     */
    issue({ genesis, codehash, genesisWif, receiverAddress, tokenAmount, allowIncreaseIssues, utxos, changeAddress, opreturnData, }: {
        genesis: string;
        codehash: string;
        genesisWif: string;
        receiverAddress: any;
        tokenAmount: string | bigint;
        allowIncreaseIssues: boolean;
        utxos: any;
        changeAddress: any;
        opreturnData: any;
    }): Promise<{
        tx: any;
        txid: any;
    }>;
    fetchFtUtxos(codehash: any, genesis: any, address: any): Promise<any>;
    /**
     * token转账
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.senderWif
     * @param {Array} param0.receivers
     * @param {Array=} param0.utxos
     * @param {String=} param0.changeAddress
     * @param {String=} param0.opreturnData
     * @returns
     */
    transfer({ codehash, genesis, senderWif, receivers, utxos, changeAddress, isMerge, opreturnData, }: {
        codehash: string;
        genesis: string;
        senderWif: string;
        receivers?: any[];
        utxos: any[];
        changeAddress: any;
        isMerge?: boolean;
        opreturnData?: any;
    }): Promise<{
        tx: any;
        routeCheckTx: any;
        txid: any;
    }>;
    /**
     * 合并钱包最多20个token-utxo
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.senderWif
     * @param {Array=} param0.utxos
     * @param {String=} param0.changeAddress
     * @returns
     */
    merge({ codehash, genesis, senderWif, utxos, changeAddress, }: {
        codehash: string;
        genesis: string;
        senderWif: string;
        utxos: any;
        changeAddress: any;
    }): Promise<{
        tx: any;
        routeCheckTx: any;
        txid: any;
    }>;
    getBalance({ codehash, genesis, address }: {
        codehash: any;
        genesis: any;
        address: any;
    }): Promise<any>;
    /**
     * 查询某人持有的FT Token列表。获得每个token的余额
     * @param {String} address
     * @returns
     */
    getSummary(address: string): Promise<any>;
    getGenesisEstimateFee({ opreturnData }: {
        opreturnData: any;
    }): Promise<number>;
    getIssueEstimateFee({ opreturnData, allowIncreaseIssues }: {
        opreturnData: any;
        allowIncreaseIssues?: boolean;
    }): Promise<number>;
    /**
     * 提前计算费用
     * @param {Object} param0
     * @param {String} param0.genesis
     * @param {String} param0.codehash
     * @param {String} param0.senderWif
     * @param {Array} param0.receivers
     * @param {String=} param0.opreturnData
     * @returns
     */
    getTransferEstimateFee({ codehash, genesis, senderWif, receivers, opreturnData, }: {
        codehash: any;
        genesis: any;
        senderWif: any;
        receivers: any;
        opreturnData: any;
    }): Promise<number>;
}
