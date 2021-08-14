import * as bsv from "../../bsv";
import * as proto from "../../common/protoheader";
import * as Utils from "../../common/utils";
import { toHex } from "../../scryptlib";
import BN = require("../../bn.js");
export type MetaidOutpoint = {
  txid: string;
  index: number;
};
export type SensibleID = {
  txid: string;
  index: number;
};
export type FormatedDataPart = {
  metaidOutpoint?: MetaidOutpoint;
  genesisFlag?: GENESIS_FLAG;
  nftAddress?: string;
  totalSupply?: BN;
  tokenIndex?: BN;
  genesisHash?: string;
  rabinPubKeyHashArrayHash?: string;
  sensibleID?: SensibleID;
  protoVersion?: number;
  protoType?: proto.PROTO_TYPE;
};
export const SIGNER_NUM = 5;
export const SIGNER_VERIFY_NUM = 3;
export enum NFT_OP_TYPE {
  TRANSFER = 1,
  UNLOCK_FROM_CONTRACT = 2,
}
export const PROTO_VERSION = 1;

export enum GENESIS_FLAG {
  FALSE = 0,
  TRUE = 1,
}

// <type specific data> + <proto header>
// <proto header> = <type(4 bytes)> + <'sensible'(8 bytes)>
//<nft type specific data> = <metaid_outpoint(36 bytes)> + <is_genesis(1 byte)> + <address(20 bytes)> + <totalSupply(8 bytes) + <tokenIndex(8 bytes)> + <genesisHash<20 bytes>) + <RABIN_PUBKEY_HASH_ARRAY_HASH(20 bytes)> + <sensibleID(36 bytes)>
const SENSIBLE_ID_LEN = 36;
const RABIN_PUBKEY_HASH_ARRAY_HASH_LEN = 20;
const GENESIS_HASH_LEN = 20;
const TOKEN_INDEX_LEN = 8;
const NFT_ID_LEN = 20;
const TOTAL_SUPPLY_LEN = 8;
const NFT_ADDRESS_LEN = 20;
const GENESIS_FLAG_LEN = 1;
const METAID_OUTPOINT_LEN = 36;

const SENSIBLE_ID_OFFSET = SENSIBLE_ID_LEN + proto.getHeaderLen();
const RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET =
  SENSIBLE_ID_OFFSET + RABIN_PUBKEY_HASH_ARRAY_HASH_LEN;
const GENESIS_HASH_OFFSET =
  RABIN_PUBKEY_HASH_ARRAY_HASH_OFFSET + GENESIS_HASH_LEN;
const TOKEN_INDEX_OFFSET = GENESIS_HASH_OFFSET + TOKEN_INDEX_LEN;
const TOTAL_SUPPLY_OFFSET = TOKEN_INDEX_OFFSET + TOTAL_SUPPLY_LEN;
const NFT_ADDRESS_OFFSET = TOTAL_SUPPLY_OFFSET + NFT_ADDRESS_LEN;
const GENESIS_FLAG_OFFSET = NFT_ADDRESS_OFFSET + GENESIS_FLAG_LEN;
const METAID_OUTPOINT_OFFSET = GENESIS_FLAG_OFFSET + METAID_OUTPOINT_LEN;

const DATA_LEN = METAID_OUTPOINT_OFFSET;
export const GENESIS_TOKEN_ID = Buffer.alloc(NFT_ID_LEN, 0);
export const EMPTY_ADDRESS = Buffer.alloc(NFT_ADDRESS_LEN, 0);

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

export function getTokenIndex(script: Buffer): BN {
  if (script.length < TOKEN_INDEX_OFFSET) return BN.Zero;
  return BN.fromBuffer(
    script.slice(
      script.length - TOKEN_INDEX_OFFSET,
      script.length - TOKEN_INDEX_OFFSET + TOKEN_INDEX_LEN
    ),
    { endian: "little" }
  );
}

export function getNftID(script: Buffer) {
  return bsv.crypto.Hash.sha256ripemd160(
    script.slice(
      script.length - TOKEN_INDEX_OFFSET,
      script.length - proto.getHeaderLen()
    )
  );
}

export function getTotalSupply(script: Buffer): BN {
  if (script.length < TOTAL_SUPPLY_OFFSET) return BN.Zero;
  return BN.fromBuffer(
    script.slice(
      script.length - TOTAL_SUPPLY_OFFSET,
      script.length - TOTAL_SUPPLY_OFFSET + TOTAL_SUPPLY_LEN
    ),
    { endian: "little" }
  );
}

export function getNftAddress(script: Buffer) {
  if (script.length < NFT_ADDRESS_OFFSET) return "";
  return script
    .slice(
      script.length - NFT_ADDRESS_OFFSET,
      script.length - NFT_ADDRESS_OFFSET + NFT_ADDRESS_LEN
    )
    .toString("hex");
}

export function getGenesisFlag(script: Buffer): number {
  if (script.length < GENESIS_FLAG_OFFSET) return 0;
  return script.readUIntLE(
    script.length - GENESIS_FLAG_OFFSET,
    GENESIS_FLAG_LEN
  );
}

export function getContractCode(script: Buffer) {
  return script.slice(
    0,
    script.length - DATA_LEN - Utils.getVarPushdataHeader(DATA_LEN).length
  );
}

export function getContractCodeHash(script: Buffer) {
  return bsv.crypto.Hash.sha256ripemd160(getContractCode(script));
}

export function getMetaidOutpoint(script0: Buffer) {
  if (script0.length < METAID_OUTPOINT_OFFSET) return { txid: "", index: 0 };
  let script = Buffer.from(script0);
  let metaidOutpointBuf = script.slice(
    script.length - METAID_OUTPOINT_OFFSET,
    script.length - METAID_OUTPOINT_OFFSET + METAID_OUTPOINT_LEN
  );
  let txid = metaidOutpointBuf.slice(0, 32).reverse().toString("hex"); //reverse会改变原对象
  let index = metaidOutpointBuf.readUIntLE(32, 4);
  let outpoint = { txid, index };
  return outpoint;
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
  let outpoint = { txid, index };
  return outpoint;
}

export function newDataPart({
  metaidOutpoint,
  genesisFlag,
  nftAddress,
  totalSupply,
  tokenIndex,
  genesisHash,
  rabinPubKeyHashArrayHash,
  sensibleID,
  protoVersion,
  protoType,
}: FormatedDataPart): Buffer {
  let metaidOutpointBuf = Buffer.alloc(METAID_OUTPOINT_LEN, 0);
  if (metaidOutpoint && metaidOutpoint.txid) {
    const txidBuf = Buffer.from(metaidOutpoint.txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(metaidOutpoint.index);
    metaidOutpointBuf = Buffer.concat([txidBuf, indexBuf]);
  }

  const genesisFlagBuf = Buffer.alloc(GENESIS_FLAG_LEN, 0);
  if (genesisFlag) {
    genesisFlagBuf.writeUInt8(genesisFlag);
  }

  const nftAddressBuf = Buffer.alloc(NFT_ADDRESS_LEN, 0);
  if (nftAddress) {
    nftAddressBuf.write(nftAddress, "hex");
  }

  let totalSupplyBuf = Buffer.alloc(TOTAL_SUPPLY_LEN, 0);
  if (totalSupply) {
    totalSupplyBuf = totalSupply
      .toBuffer({ endian: "little", size: TOTAL_SUPPLY_LEN })
      .slice(0, TOTAL_SUPPLY_LEN);
  }

  let tokenIndexBuf = Buffer.alloc(TOKEN_INDEX_LEN, 0);
  if (tokenIndex) {
    tokenIndexBuf = tokenIndex.toBuffer({
      endian: "little",
      size: TOKEN_INDEX_LEN,
    });
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

  const protoVersionBuf = Buffer.alloc(proto.PROTO_VERSION_LEN);
  if (protoVersion) {
    protoVersionBuf.writeUInt32LE(protoVersion);
  }

  const protoTypeBuf = Buffer.alloc(proto.PROTO_TYPE_LEN, 0);
  if (protoType) {
    protoTypeBuf.writeUInt32LE(protoType);
  }

  return Buffer.concat([
    metaidOutpointBuf,
    genesisFlagBuf,
    nftAddressBuf,
    totalSupplyBuf,
    tokenIndexBuf,
    genesisHashBuf,
    rabinPubKeyHashArrayHashBuf,
    sensibleIDBuf,
    protoVersionBuf,
    protoTypeBuf,
    proto.PROTO_FLAG,
  ]);
}

export function parseDataPart(scriptBuf: Buffer): FormatedDataPart {
  let metaidOutpoint = getMetaidOutpoint(scriptBuf);
  let genesisFlag = getGenesisFlag(scriptBuf);
  let nftAddress = getNftAddress(scriptBuf);
  let totalSupply = getTotalSupply(scriptBuf);
  let tokenIndex = getTokenIndex(scriptBuf);
  let genesisHash = getGenesisHash(scriptBuf);
  let rabinPubKeyHashArrayHash = getRabinPubKeyHashArrayHash(scriptBuf);
  let sensibleID = getSensibleID(scriptBuf);
  let protoVersion = proto.getProtoVersioin(scriptBuf);
  let protoType = proto.getProtoType(scriptBuf);
  return {
    metaidOutpoint,
    genesisFlag,
    nftAddress,
    totalSupply,
    tokenIndex,
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
  const firstBuf = scriptBuf.slice(0, scriptBuf.length - DATA_LEN);
  const dataPart = newDataPart(dataPartObj);
  return Buffer.concat([firstBuf, dataPart]);
}

export function getQueryCodehash(script: Buffer): string {
  return toHex(getContractCodeHash(script));
}

export function getQueryGenesis(script: Buffer): string {
  return toHex(
    bsv.crypto.Hash.sha256ripemd160(
      script.slice(
        script.length - GENESIS_HASH_OFFSET,
        script.length - proto.getHeaderLen()
      )
    )
  );
}

export function getQuerySensibleID(script0: Buffer) {
  let script = Buffer.from(script0);
  let sensibleIDBuf = script.slice(
    script.length - SENSIBLE_ID_OFFSET,
    script.length - SENSIBLE_ID_OFFSET + SENSIBLE_ID_LEN
  );
  return toHex(sensibleIDBuf);
}
