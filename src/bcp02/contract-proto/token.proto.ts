import * as BN from "../../bn.js";
import * as bsv from "../../bsv";
import * as proto from "../../common/protoheader";
import * as Utils from "../../common/utils";
import { toHex } from "../../scryptlib";
export const PROTO_VERSION = 1;
export const SIGNER_NUM = 5;
export const SIGNER_VERIFY_NUM = 3;

export type SensibleID = {
  txid: string;
  index: number;
};
export type FormatedDataPart = {
  tokenName?: string;
  tokenSymbol?: string;
  genesisFlag?: GENESIS_FLAG;
  decimalNum?: number;
  tokenAddress?: string;
  tokenAmount?: BN;
  genesisHash?: string;
  rabinPubKeyHashArrayHash?: string;
  sensibleID?: SensibleID;
  protoVersion?: number;
  protoType?: proto.PROTO_TYPE;
};

// token specific
//<type specific data> = <token_name (20 bytes)> + <token_symbol (10 bytes)> + <is_genesis(1 byte)> + <decimal_num(1 byte)> + <public key hash(20 bytes)> + <token value(8 bytes)> + <tokenid(36 bytes)> + <proto header>
const TOKEN_ID_LEN = 20;
const SENSIBLE_ID_LEN = 36;
const RABIN_PUBKEY_HASH_ARRAY_HASH_LEN = 20;
const GENESIS_HASH_LEN = 20;
const TOKEN_AMOUNT_LEN = 8;
const TOKEN_ADDRESS_LEN = 20;
const DECIMAL_NUM_LEN = 1;
const GENESIS_FLAG_LEN = 1;
const TOKEN_SYMBOL_LEN = 10;
const TOKEN_NAME_LEN = 20;

const SENSIBLE_ID_OFFSET = SENSIBLE_ID_LEN + proto.getHeaderLen();
const RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET =
  SENSIBLE_ID_OFFSET + RABIN_PUBKEY_HASH_ARRAY_HASH_LEN;
const GENESIS_HASH_OFFSET =
  RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET + GENESIS_HASH_LEN;
const TOKEN_AMOUNT_OFFSET = GENESIS_HASH_OFFSET + TOKEN_AMOUNT_LEN;
const TOKEN_ADDRESS_OFFSET = TOKEN_AMOUNT_OFFSET + TOKEN_ADDRESS_LEN;
const DECIMAL_NUM_OFFSET = TOKEN_ADDRESS_OFFSET + DECIMAL_NUM_LEN;
const GENESIS_FLAG_OFFSET = DECIMAL_NUM_OFFSET + GENESIS_FLAG_LEN;
const TOKEN_SYMBOL_OFFSET = GENESIS_FLAG_OFFSET + TOKEN_SYMBOL_LEN;
const TOKEN_NAME_OFFSET = TOKEN_SYMBOL_OFFSET + TOKEN_NAME_LEN;

const TOKEN_HEADER_LEN = TOKEN_NAME_OFFSET;

export const GENESIS_TOKEN_ID = Buffer.alloc(TOKEN_ID_LEN, 0);
export const EMPTY_ADDRESS = Buffer.alloc(TOKEN_ADDRESS_LEN, 0);
export const nonGenesisFlag = Buffer.alloc(1, 0);
export const OP_TRANSFER = 1;
export const OP_UNLOCK_FROM_CONTRACT = 2;

export enum FT_OP_TYPE {
  TRANSFER = 1,
  UNLOCK_FROM_CONTRACT = 2,
}

export enum GENESIS_FLAG {
  FALSE = 0,
  TRUE = 1,
}

export function getHeaderLen(): number {
  return TOKEN_HEADER_LEN;
}

export function getTokenAmount(script: Buffer): BN {
  if (script.length < TOKEN_AMOUNT_OFFSET) return BN.Zero;
  return BN.fromBuffer(
    script.slice(
      script.length - TOKEN_AMOUNT_OFFSET,
      script.length - TOKEN_AMOUNT_OFFSET + TOKEN_AMOUNT_LEN
    ),
    { endian: "little" }
  );
}

export function getTokenID(script: Buffer) {
  return bsv.crypto.Hash.sha256ripemd160(
    script.slice(
      script.length - GENESIS_HASH_OFFSET,
      script.length - proto.getHeaderLen()
    )
  );
}

export function getSensibleID(script0: Buffer) {
  if (script0.length < SENSIBLE_ID_OFFSET) return { txid: "", index: 0 };
  let script = Buffer.from(script0);
  let sensibleIDBuf = script.slice(
    script.length - SENSIBLE_ID_OFFSET,
    script.length - SENSIBLE_ID_OFFSET + SENSIBLE_ID_LEN
  );
  let txid = sensibleIDBuf.slice(0, 32).reverse().toString("hex"); //reverse会改变原对象
  let index = sensibleIDBuf.readUIntLE(32, 4);
  let sensibleID = { txid, index };
  return sensibleID;
}

export function getRabinPubKeyHashArrayHash(script: Buffer) {
  return script
    .slice(
      script.length - RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET,
      script.length -
        RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET +
        RABIN_PUBKEY_HASH_ARRAY_HASH_LEN
    )
    .toString("hex");
}

export function getGenesisHash(script: Buffer) {
  return script
    .slice(
      script.length - GENESIS_HASH_OFFSET,
      script.length - GENESIS_HASH_OFFSET + GENESIS_HASH_LEN
    )
    .toString("hex");
}

export function getTokenAddress(script: Buffer): string {
  if (script.length < TOKEN_ADDRESS_OFFSET) return "";
  return script
    .slice(
      script.length - TOKEN_ADDRESS_OFFSET,
      script.length - TOKEN_ADDRESS_OFFSET + TOKEN_ADDRESS_LEN
    )
    .toString("hex");
}

export function getDecimalNum(script: Buffer): number {
  if (script.length < DECIMAL_NUM_OFFSET) return 0;
  return script.readUIntLE(script.length - DECIMAL_NUM_OFFSET, DECIMAL_NUM_LEN);
}

export function getGenesisFlag(script: Buffer): number {
  if (script.length < GENESIS_FLAG_OFFSET) return 0;
  return script.readUIntLE(
    script.length - GENESIS_FLAG_OFFSET,
    GENESIS_FLAG_LEN
  );
}

export function getTokenSymbol(script: Buffer): string {
  if (script.length < TOKEN_SYMBOL_OFFSET) return "";

  let buf = script.slice(
    script.length - TOKEN_SYMBOL_OFFSET,
    script.length - TOKEN_SYMBOL_OFFSET + TOKEN_SYMBOL_LEN
  );
  return buf.toString();
}

export function getTokenName(script: Buffer): string {
  if (script.length < TOKEN_NAME_OFFSET) return "";

  let buf = script.slice(
    script.length - TOKEN_NAME_OFFSET,
    script.length - TOKEN_NAME_OFFSET + TOKEN_NAME_LEN
  );
  return buf.toString();
}

export function getContractCode(script: Buffer): Buffer {
  return script.slice(
    0,
    script.length -
      TOKEN_HEADER_LEN -
      Utils.getVarPushdataHeader(TOKEN_HEADER_LEN).length
  );
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
  tokenAmount: BN
): Buffer {
  const amountBuf = tokenAmount.toBuffer({ endian: "little", size: 8 });
  const firstBuf = scriptBuf.slice(0, scriptBuf.length - TOKEN_ADDRESS_OFFSET);
  const newScript = Buffer.concat([
    firstBuf,
    address,
    amountBuf,
    scriptBuf.slice(scriptBuf.length - GENESIS_HASH_OFFSET, scriptBuf.length),
  ]);
  return newScript;
}

export function newDataPart({
  tokenName,
  tokenSymbol,
  genesisFlag,
  decimalNum,
  tokenAddress,
  tokenAmount,
  genesisHash,
  rabinPubKeyHashArrayHash,
  sensibleID,
  protoVersion,
  protoType,
}: FormatedDataPart): Buffer {
  const tokenNameBuf = Buffer.alloc(TOKEN_NAME_LEN, 0);
  if (tokenName) {
    tokenNameBuf.write(tokenName);
  }

  const tokenSymbolBuf = Buffer.alloc(TOKEN_SYMBOL_LEN, 0);
  if (tokenSymbol) {
    tokenSymbolBuf.write(tokenSymbol);
  }

  const decimalBuf = Buffer.alloc(DECIMAL_NUM_LEN, 0);
  if (decimalNum) {
    decimalBuf.writeUInt8(decimalNum);
  }

  const genesisFlagBuf = Buffer.alloc(GENESIS_FLAG_LEN, 0);
  if (genesisFlag) {
    genesisFlagBuf.writeUInt8(genesisFlag);
  }

  const tokenAddressBuf = Buffer.alloc(TOKEN_ADDRESS_LEN, 0);
  if (tokenAddress) {
    tokenAddressBuf.write(tokenAddress, "hex");
  }

  let tokenAmountBuf = Buffer.alloc(TOKEN_AMOUNT_LEN, 0);
  if (tokenAmount) {
    tokenAmountBuf = tokenAmount.toBuffer({ endian: "little", size: 8 });
  }

  const genesisHashBuf = Buffer.alloc(GENESIS_HASH_LEN, 0);
  if (genesisHash) {
    genesisHashBuf.write(genesisHash, "hex");
  }

  const rabinPubKeyHashArrayHashBuf = Buffer.alloc(
    RABIN_PUBKEY_HASH_ARRAY_HASH_LEN,
    0
  );
  if (rabinPubKeyHashArrayHash) {
    rabinPubKeyHashArrayHashBuf.write(rabinPubKeyHashArrayHash, "hex");
  }

  let sensibleIDBuf = Buffer.alloc(SENSIBLE_ID_LEN, 0);
  if (sensibleID) {
    const txidBuf = Buffer.from(sensibleID.txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(sensibleID.index);
    sensibleIDBuf = Buffer.concat([txidBuf, indexBuf]);
  }

  const protoTypeBuf = Buffer.alloc(proto.PROTO_TYPE_LEN, 0);
  if (protoType) {
    protoTypeBuf.writeUInt32LE(protoType);
  }

  const protoVersionBuf = Buffer.alloc(proto.PROTO_VERSION_LEN);
  if (protoVersion) {
    protoVersionBuf.writeUInt32LE(protoVersion);
  }

  return Buffer.concat([
    tokenNameBuf,
    tokenSymbolBuf,
    genesisFlagBuf,
    decimalBuf,
    tokenAddressBuf,
    tokenAmountBuf,
    genesisHashBuf,
    rabinPubKeyHashArrayHashBuf,
    sensibleIDBuf,
    protoVersionBuf,
    protoTypeBuf,
    proto.PROTO_FLAG,
  ]);
}

export function parseDataPart(scriptBuf: Buffer): FormatedDataPart {
  let tokenName = getTokenName(scriptBuf);
  let tokenSymbol = getTokenSymbol(scriptBuf);
  let decimalNum = getDecimalNum(scriptBuf);
  let genesisFlag = getGenesisFlag(scriptBuf);
  let tokenAddress = getTokenAddress(scriptBuf);
  let tokenAmount = getTokenAmount(scriptBuf);
  let genesisHash = getGenesisHash(scriptBuf);
  let rabinPubKeyHashArrayHash = getRabinPubKeyHashArrayHash(scriptBuf);
  let sensibleID = getSensibleID(scriptBuf);
  let protoVersion = proto.getProtoVersioin(scriptBuf);
  let protoType = proto.getProtoType(scriptBuf);
  return {
    tokenName,
    tokenSymbol,
    decimalNum,
    genesisFlag,
    tokenAddress,
    tokenAmount,
    genesisHash,
    rabinPubKeyHashArrayHash,
    sensibleID,
    protoVersion,
    protoType,
  };
}

export function updateScript(
  scriptBuf: Buffer,
  dataPartObj: FormatedDataPart
): Buffer {
  const firstBuf = scriptBuf.slice(0, scriptBuf.length - TOKEN_HEADER_LEN);
  const dataPart = newDataPart(dataPartObj);
  return Buffer.concat([firstBuf, dataPart]);
}

export function getQueryCodehash(script: Buffer): string {
  return toHex(getContractCodeHash(script));
}

export function getQueryGenesis(script: Buffer): string {
  return toHex(getTokenID(script));
}

export function getQuerySensibleID(script0: Buffer): string {
  let script = Buffer.from(script0);
  let sensibleIDBuf = script.slice(
    script.length - SENSIBLE_ID_OFFSET,
    script.length - SENSIBLE_ID_OFFSET + SENSIBLE_ID_LEN
  );
  return toHex(sensibleIDBuf);
}
