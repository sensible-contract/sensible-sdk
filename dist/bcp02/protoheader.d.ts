/// <reference types="node" />
export declare const PROTO_FLAG: Buffer;
export declare const PROTO_FLAG_LEN: number;
export declare const TYPE_LEN = 4;
export declare const TYPE_OFFSET: number;
export declare const HEADER_LEN: number;
export declare function getHeaderLen(): number;
export declare function getFlag(script: Buffer): Buffer;
export declare function getHeaderType(script: Buffer): number;
export declare function HasProtoFlag(script: Buffer): boolean;
