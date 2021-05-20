import { bsv } from "scryptlib";
import * as proto from "./protoheader";
export type TokenID = {
  txid: string;
  index: number;
};
export type TokenDataPart = {
  tokenName?: string;
  tokenSymbol?: string;
  genesisFlag?: number;
  decimalNum?: number;
  tokenAddress?: string;
  tokenAmount?: bigint;
  tokenID?: TokenID;
  tokenType?: number;
};
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

export const GENESIS_TOKEN_ID = Buffer.alloc(TOKEN_ID_LEN, 0);
export const EMPTY_ADDRESS = Buffer.alloc(TOKEN_ADDRESS_LEN, 0);
export const PROTO_TYPE = 1;

export function getHeaderLen(): number {
  return TOKEN_HEADER_LEN;
}

export function getTokenAmount(script: Buffer): bigint {
  return script.readBigUInt64LE(script.length - TOKEN_AMOUNT_OFFSET);
}

export function getTokenID(script0: Buffer): TokenID {
  let script = Buffer.from(script0);
  let tokenIDBuf = script.slice(
    script.length - TOKEN_ID_OFFSET,
    script.length - TOKEN_ID_OFFSET + TOKEN_ID_LEN
  );
  let txid = tokenIDBuf.slice(0, 32).reverse().toString("hex"); //reverse会改变原对象
  let index = tokenIDBuf.readUIntLE(32, 4);
  let tokenID = { txid, index };
  return tokenID;
}

export function getTokenAddress(script: Buffer): string {
  return script
    .slice(
      script.length - TOKEN_ADDRESS_OFFSET,
      script.length - TOKEN_ADDRESS_OFFSET + TOKEN_ADDRESS_LEN
    )
    .toString("hex");
}

export function getDecimalNum(script: Buffer): number {
  return script.readUIntLE(script.length - DECIMAL_NUM_OFFSET, DECIMAL_NUM_LEN);
}

export function getGenesisFlag(script: Buffer): number {
  return script.readUIntLE(
    script.length - GENESIS_FLAG_OFFSET,
    GENESIS_FLAG_LEN
  );
}

export function getTokenSymbol(script: Buffer): string {
  let buf = script.slice(
    script.length - TOKEN_SYMBOL_OFFSET,
    script.length - TOKEN_SYMBOL_OFFSET + TOKEN_SYMBOL_LEN
  );
  buf = buf.slice(0, buf.indexOf(Buffer.from("00", "hex")));
  return buf.toString();
}

export function getTokenName(script: Buffer): string {
  let buf = script.slice(
    script.length - TOKEN_NAME_OFFSET,
    script.length - TOKEN_NAME_OFFSET + TOKEN_NAME_LEN
  );
  buf = buf.slice(0, buf.indexOf(Buffer.from("00", "hex")));
  return buf.toString();
}

export function getContractCode(script: Buffer): Buffer {
  return script.slice(0, script.length - TOKEN_HEADER_LEN - 3);
}

export function getContractCodeHash(script: Buffer) {
  return bsv.crypto.Hash.sha256ripemd160(getContractCode(script));
}

export function getDataPart(script: Buffer): Buffer {
  return script.slice(script.length - TOKEN_HEADER_LEN, script.length);
}

export function getNewTokenScript(
  scriptBuf: Buffer,
  address: Buffer,
  tokenAmount: bigint
): Buffer {
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

export function newTokenID(txid: string, index: number): Buffer {
  const txidBuf = Buffer.from(txid, "hex").reverse();
  const indexBuf = Buffer.alloc(4, 0);
  indexBuf.writeUInt32LE(index);
  return Buffer.concat([txidBuf, indexBuf]);
}

export function newDataPart({
  tokenName,
  tokenSymbol,
  genesisFlag,
  decimalNum,
  tokenAddress,
  tokenAmount,
  tokenID,
  tokenType,
}: TokenDataPart): Buffer {
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

export function parseDataPart(scriptBuf: Buffer): TokenDataPart {
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

export function updateScript(
  scriptBuf: Buffer,
  dataPartObj: TokenDataPart
): Buffer {
  const firstBuf = scriptBuf.slice(0, scriptBuf.length - TOKEN_HEADER_LEN);
  const dataPart = newDataPart(dataPartObj);
  return Buffer.concat([firstBuf, dataPart]);
}
