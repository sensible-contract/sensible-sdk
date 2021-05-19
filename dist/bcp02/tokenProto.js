"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateScript = exports.parseDataPart = exports.newDataPart = exports.newTokenID = exports.getNewTokenScript = exports.getDataPart = exports.getContractCodeHash = exports.getContractCode = exports.getTokenName = exports.getTokenSymbol = exports.getGenesisFlag = exports.getDecimalNum = exports.getTokenAddress = exports.getTokenID = exports.getTokenAmount = exports.getHeaderLen = exports.PROTO_TYPE = exports.EMPTY_ADDRESS = exports.GENESIS_TOKEN_ID = void 0;
const scryptlib_1 = require("scryptlib");
const proto = require("./protoheader");
// token specific
//<type specific data> = <token_name (20 bytes)> + <token_symbol (10 bytes)> + <is_genesis(1 byte)> + <decimal_num(1 byte)> + <public key hash(20 bytes)> + <token value(8 bytes)> + <tokenid(36 bytes)> + <proto header>
const TOKEN_ID_LEN = 36;
const TOKEN_AMOUNT_LEN = 8;
const TOKEN_ADDRESS_LEN = 20;
const DECIMAL_NUM_LEN = 1;
const GENESIS_FLAG_LEN = 1;
const TOKEN_SYMBOL_LEN = 10;
const TOKEN_NAME_LEN = 20;
const TOKEN_ID_OFFSET = TOKEN_ID_LEN + proto.getHeaderLen();
const TOKEN_AMOUNT_OFFSET = TOKEN_ID_OFFSET + TOKEN_AMOUNT_LEN;
const TOKEN_ADDRESS_OFFSET = TOKEN_AMOUNT_OFFSET + TOKEN_ADDRESS_LEN;
const DECIMAL_NUM_OFFSET = TOKEN_ADDRESS_OFFSET + DECIMAL_NUM_LEN;
const GENESIS_FLAG_OFFSET = DECIMAL_NUM_OFFSET + GENESIS_FLAG_LEN;
const TOKEN_SYMBOL_OFFSET = GENESIS_FLAG_OFFSET + TOKEN_SYMBOL_LEN;
const TOKEN_NAME_OFFSET = TOKEN_SYMBOL_OFFSET + TOKEN_NAME_LEN;
const TOKEN_HEADER_LEN = TOKEN_NAME_OFFSET;
exports.GENESIS_TOKEN_ID = Buffer.alloc(TOKEN_ID_LEN, 0);
exports.EMPTY_ADDRESS = Buffer.alloc(TOKEN_ADDRESS_LEN, 0);
exports.PROTO_TYPE = 1;
function getHeaderLen() {
    return TOKEN_HEADER_LEN;
}
exports.getHeaderLen = getHeaderLen;
function getTokenAmount(script) {
    return script.readBigUInt64LE(script.length - TOKEN_AMOUNT_OFFSET);
}
exports.getTokenAmount = getTokenAmount;
function getTokenID(script) {
    let tokenIDBuf = script.slice(script.length - TOKEN_ID_OFFSET, script.length - TOKEN_ID_OFFSET + TOKEN_ID_LEN);
    let txid = tokenIDBuf.slice(0, 32).reverse().toString("hex");
    let index = tokenIDBuf.readUIntLE(32, 4);
    let tokenID = { txid, index };
    return tokenID;
}
exports.getTokenID = getTokenID;
function getTokenAddress(script) {
    return script
        .slice(script.length - TOKEN_ADDRESS_OFFSET, script.length - TOKEN_ADDRESS_OFFSET + TOKEN_ADDRESS_LEN)
        .toString("hex");
}
exports.getTokenAddress = getTokenAddress;
function getDecimalNum(script) {
    return script.readUIntLE(script.length - DECIMAL_NUM_OFFSET, DECIMAL_NUM_LEN);
}
exports.getDecimalNum = getDecimalNum;
function getGenesisFlag(script) {
    return script.readUIntLE(script.length - GENESIS_FLAG_OFFSET, GENESIS_FLAG_LEN);
}
exports.getGenesisFlag = getGenesisFlag;
function getTokenSymbol(script) {
    let buf = script.slice(script.length - TOKEN_SYMBOL_OFFSET, script.length - TOKEN_SYMBOL_OFFSET + TOKEN_SYMBOL_LEN);
    buf = buf.slice(0, buf.indexOf(Buffer.from("00", "hex")));
    return buf.toString();
}
exports.getTokenSymbol = getTokenSymbol;
function getTokenName(script) {
    let buf = script.slice(script.length - TOKEN_NAME_OFFSET, script.length - TOKEN_NAME_OFFSET + TOKEN_NAME_LEN);
    buf = buf.slice(0, buf.indexOf(Buffer.from("00", "hex")));
    return buf.toString();
}
exports.getTokenName = getTokenName;
function getContractCode(script) {
    return script.slice(0, script.length - TOKEN_HEADER_LEN - 3);
}
exports.getContractCode = getContractCode;
function getContractCodeHash(script) {
    return scryptlib_1.bsv.crypto.Hash.sha256ripemd160(getContractCode(script));
}
exports.getContractCodeHash = getContractCodeHash;
function getDataPart(script) {
    return script.slice(script.length - TOKEN_HEADER_LEN, script.length);
}
exports.getDataPart = getDataPart;
function getNewTokenScript(scriptBuf, address, tokenAmount) {
    const amountBuf = Buffer.alloc(8, 0);
    amountBuf.writeBigUInt64LE(BigInt(tokenAmount));
    const firstBuf = scriptBuf.slice(0, scriptBuf.length - TOKEN_ADDRESS_OFFSET);
    const newScript = Buffer.concat([
        firstBuf,
        address,
        amountBuf,
        scriptBuf.slice(scriptBuf.length - TOKEN_ID_OFFSET, scriptBuf.length),
    ]);
    return newScript;
}
exports.getNewTokenScript = getNewTokenScript;
function newTokenID(txid, index) {
    const txidBuf = Buffer.from(txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(index);
    return Buffer.concat([txidBuf, indexBuf]);
}
exports.newTokenID = newTokenID;
function newDataPart({ tokenName, tokenSymbol, genesisFlag, decimalNum, tokenAddress, tokenAmount, tokenID, tokenType, }) {
    const tokenNameBuf = Buffer.alloc(TOKEN_NAME_LEN, 0);
    tokenNameBuf.write(tokenName);
    const tokenSymbolBuf = Buffer.alloc(TOKEN_SYMBOL_LEN, 0);
    tokenSymbolBuf.write(tokenSymbol);
    const decimalBuf = Buffer.alloc(DECIMAL_NUM_LEN, 0);
    decimalBuf.writeUInt8(decimalNum);
    const genesisFlagBuf = Buffer.alloc(GENESIS_FLAG_LEN, 0);
    genesisFlagBuf.writeUInt8(genesisFlag);
    const tokenAddressBuf = Buffer.alloc(TOKEN_ADDRESS_LEN, 0);
    if (tokenAddress) {
        tokenAddressBuf.write(tokenAddress, "hex");
    }
    const tokenAmountBuf = Buffer.alloc(TOKEN_AMOUNT_LEN, 0);
    if (tokenAmount) {
        tokenAmountBuf.writeBigUInt64LE(tokenAmount);
    }
    let tokenIDBuf = Buffer.alloc(TOKEN_ID_LEN, 0);
    if (tokenID) {
        const txidBuf = Buffer.from(tokenID.txid, "hex").reverse();
        const indexBuf = Buffer.alloc(4, 0);
        indexBuf.writeUInt32LE(tokenID.index);
        tokenIDBuf = Buffer.concat([txidBuf, indexBuf]);
    }
    const tokenTypeBuf = Buffer.alloc(proto.TYPE_LEN, 0);
    tokenTypeBuf.writeUInt32LE(tokenType);
    return Buffer.concat([
        tokenNameBuf,
        tokenSymbolBuf,
        genesisFlagBuf,
        decimalBuf,
        tokenAddressBuf,
        tokenAmountBuf,
        tokenIDBuf,
        tokenTypeBuf,
        proto.PROTO_FLAG,
    ]);
}
exports.newDataPart = newDataPart;
function parseDataPart(scriptBuf) {
    let tokenName = getTokenName(scriptBuf);
    let tokenSymbol = getTokenSymbol(scriptBuf);
    let decimalNum = getDecimalNum(scriptBuf);
    let genesisFlag = getGenesisFlag(scriptBuf);
    let tokenAddress = getTokenAddress(scriptBuf);
    let tokenAmount = getTokenAmount(scriptBuf);
    let tokenID = getTokenID(scriptBuf);
    let tokenType = proto.getHeaderType(scriptBuf);
    return {
        tokenName,
        tokenSymbol,
        decimalNum,
        genesisFlag,
        tokenAddress,
        tokenAmount,
        tokenID,
        tokenType,
    };
}
exports.parseDataPart = parseDataPart;
function updateScript(scriptBuf, dataPartObj) {
    const firstBuf = scriptBuf.slice(0, scriptBuf.length - TOKEN_HEADER_LEN);
    const dataPart = newDataPart(dataPartObj);
    return Buffer.concat([firstBuf, dataPart]);
}
exports.updateScript = updateScript;
