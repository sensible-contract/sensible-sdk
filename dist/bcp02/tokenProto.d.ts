/// <reference types="node" />
export declare type TokenID = {
    txid: string;
    index: number;
};
export declare type TokenDataPart = {
    tokenName?: string;
    tokenSymbol?: string;
    genesisFlag?: number;
    decimalNum?: number;
    tokenAddress?: string;
    tokenAmount?: bigint;
    tokenID?: TokenID;
    tokenType?: number;
};
export declare const GENESIS_TOKEN_ID: Buffer;
export declare const EMPTY_ADDRESS: Buffer;
export declare const PROTO_TYPE = 1;
export declare function getHeaderLen(): number;
export declare function getTokenAmount(script: Buffer): bigint;
export declare function getTokenID(script: Buffer): TokenID;
export declare function getTokenAddress(script: Buffer): string;
export declare function getDecimalNum(script: Buffer): number;
export declare function getGenesisFlag(script: Buffer): number;
export declare function getTokenSymbol(script: Buffer): string;
export declare function getTokenName(script: Buffer): string;
export declare function getContractCode(script: Buffer): Buffer;
export declare function getContractCodeHash(script: Buffer): any;
export declare function getDataPart(script: Buffer): Buffer;
export declare function getNewTokenScript(scriptBuf: Buffer, address: Buffer, tokenAmount: bigint): Buffer;
export declare function newTokenID(txid: string, index: number): Buffer;
export declare function newDataPart({ tokenName, tokenSymbol, genesisFlag, decimalNum, tokenAddress, tokenAmount, tokenID, tokenType, }: TokenDataPart): Buffer;
export declare function parseDataPart(scriptBuf: Buffer): TokenDataPart;
export declare function updateScript(scriptBuf: Buffer, dataPartObj: TokenDataPart): Buffer;
