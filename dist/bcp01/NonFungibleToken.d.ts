export declare class NonFungibleToken {
    nftContract: any;
    nftCodePart: string;
    nftGenesisPart: string;
    /**
     * @param {bigint} rabinPubKey
     * @constructor NFT合约
     */
    constructor(rabinPubKey: bigint);
    setTxGenesisPart({ prevTxId, outputIndex, issueOutputIndex }: {
        prevTxId: any;
        outputIndex: any;
        issueOutputIndex?: number;
    }): void;
    makeTxGenesis({ issuerPk, tokenId, totalSupply, opreturnData, utxoPrivateKeys, utxos, changeAddress, feeb, }: {
        issuerPk: any;
        tokenId: any;
        totalSupply: any;
        opreturnData: any;
        utxoPrivateKeys: any;
        utxos: any;
        changeAddress: any;
        feeb: any;
    }): Promise<any>;
    makeTxIssue({ issuerTxId, issuerOutputIndex, issuerLockingScript, satotxData, issuerPrivateKey, receiverAddress, metaTxId, opreturnData, signers, utxos, utxoPrivateKeys, changeAddress, feeb, }: {
        issuerTxId: any;
        issuerOutputIndex: any;
        issuerLockingScript: any;
        satotxData: any;
        issuerPrivateKey: any;
        receiverAddress: any;
        metaTxId: any;
        opreturnData: any;
        signers: any;
        utxos: any;
        utxoPrivateKeys: any;
        changeAddress: any;
        feeb: any;
    }): Promise<{
        tx: any;
        tokenid: bigint;
    }>;
    makeTxTransfer({ transferTxId, transferOutputIndex, transferLockingScript, satotxData, senderPrivateKey, receiverAddress, opreturnData, utxos, utxoPrivateKeys, changeAddress, feeb, signers, }: {
        transferTxId: any;
        transferOutputIndex: any;
        transferLockingScript: any;
        satotxData: any;
        senderPrivateKey: any;
        receiverAddress: any;
        opreturnData: any;
        utxos: any;
        utxoPrivateKeys: any;
        changeAddress: any;
        feeb: any;
        signers: any;
    }): Promise<any>;
    getDataPartFromScript(script: any): any;
}
