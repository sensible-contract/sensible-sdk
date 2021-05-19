/// <reference types="node" />
import { Ripemd160 } from "scryptlib";
export declare const ISSUE = 0;
export declare const TRANSFER = 1;
/**
 * PayloadNFT
 */
export declare class PayloadNFT {
    dataType: number;
    ownerPkh: Ripemd160 | Buffer;
    tokenId: bigint;
    metaTxId: string;
    totalSupply: bigint;
    /**
     * 解析、构造NFT合约的数据部分
     *
     * @constructor
     *
     * @param {Object} params
     * @param {number} params.dataType 数据类型，1字节
     * @param {Ripemd160} params.ownerPkh 所属人
     * @param {bigint} params.tokenId tokenId
     * @param {string} params.metaTxId meta txid
     * @param {bigint=} params.totalSupply 发行总量
     */
    constructor({ dataType, ownerPkh, tokenId, totalSupply, metaTxId, }?: {
        dataType?: number;
        ownerPkh?: Ripemd160;
        tokenId?: bigint;
        totalSupply?: bigint;
        metaTxId?: string;
    });
    read(script: Buffer): void;
    dump(): string;
}
