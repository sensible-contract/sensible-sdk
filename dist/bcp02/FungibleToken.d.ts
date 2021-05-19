import { Bytes } from "scryptlib";
export declare const sighashType: number;
export declare enum RouteCheckType {
    from3To3 = "3To3",
    from6To6 = "6To6",
    from10To10 = "10To10",
    from3To100 = "3To100",
    from20To3 = "20To3"
}
export declare class FungibleToken {
    rabinPubKeyArray: bigint[];
    routeCheckCodeHashArray: Bytes[];
    unlockContractCodeHashArray: Bytes[];
    constructor(rabinPubKey1: bigint, rabinPubKey2: bigint, rabinPubKey3: bigint);
    /**
     * create genesis contract
     * @param {Object} issuerPubKey issuer public key used to unlocking genesis contract
     * @param {string} tokenName the token name
     * @param {string} tokenSymbol the token symbol
     * @param {number} decimalNum the token amount decimal number
     * @returns
     */
    createGenesisContract(issuerPubKey: any, { tokenName, tokenSymbol, decimalNum, }?: {
        tokenName?: string;
        tokenSymbol?: string;
        decimalNum?: number;
    }): any;
    /**
     * create a tx for genesis
     * @param {bsv.PrivateKey} privateKey the privatekey that utxos belong to
     * @param {Object[]} utxos utxos
     * @param {bsv.Address} changeAddress the change address
     * @param {number} feeb feeb
     * @param {string} genesisScript genesis contract's locking scriptsatoshis
     */
    createGenesisTx({ utxos, changeAddress, feeb, genesisContract, utxoPrivateKeys, opreturnData, }: {
        utxos: any;
        changeAddress: any;
        feeb: any;
        genesisContract: any;
        utxoPrivateKeys: any;
        opreturnData: any;
    }): any;
    /**
     * create token contract from genesis contract utxo
     * @param {string} genesisTxId the genesis txid
     * @param {number} genesisTxOutputIndex the genesis utxo output index
     * @param {bsv.Script} genesisScript the genesis contract's locking script
     * @param {bsv.Address} receiverAddress receiver's address
     * @param {BigInt} tokenAmount the token amount want to create
     * @returns
     */
    createTokenContract(genesisTxId: string, genesisTxOutputIndex: number, genesisLockingScript: any, { receiverAddress, tokenAmount, }: {
        receiverAddress: any;
        tokenAmount: bigint;
    }): any;
    createIssueTx({ genesisContract, genesisTxId, genesisTxOutputIndex, genesisLockingScript, opreturnData, utxos, changeAddress, feeb, tokenContract, allowIncreaseIssues, satotxData, signers, issuerPrivateKey, utxoPrivateKeys, }: {
        genesisContract: any;
        genesisTxId: any;
        genesisTxOutputIndex: any;
        genesisLockingScript: any;
        opreturnData: any;
        utxos: any;
        changeAddress: any;
        feeb: any;
        tokenContract: any;
        allowIncreaseIssues: any;
        satotxData: any;
        signers: any;
        issuerPrivateKey: any;
        utxoPrivateKeys: any;
    }): Promise<any>;
    createRouteCheckContract(routeCheckType: RouteCheckType, tokenInputArray: any, tokenOutputArray: any, tokenID: any, tokenCodeHash: any): any;
    createRouteCheckTx({ utxos, changeAddress, feeb, routeCheckContract, utxoPrivateKeys, }: {
        utxos: any;
        changeAddress: any;
        feeb: any;
        routeCheckContract: any;
        utxoPrivateKeys: any;
    }): any;
    createTransferTx({ routeCheckTx, tokenInputArray, satoshiInputArray, rabinPubKeyIndexArray, checkRabinMsgArray, checkRabinPaddingArray, checkRabinSigArray, tokenOutputArray, tokenRabinDatas, routeCheckContract, senderPrivateKey, utxoPrivateKeys, changeAddress, feeb, opreturnData, }: {
        routeCheckTx: any;
        tokenInputArray: any;
        satoshiInputArray: any;
        rabinPubKeyIndexArray: any;
        checkRabinMsgArray: any;
        checkRabinPaddingArray: any;
        checkRabinSigArray: any;
        tokenOutputArray: any;
        tokenRabinDatas: any;
        routeCheckContract: any;
        senderPrivateKey: any;
        utxoPrivateKeys: any;
        changeAddress: any;
        feeb: any;
        opreturnData: any;
    }): any;
}
