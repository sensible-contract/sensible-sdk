import BN = require("../../bn.js");
import * as proto from "../../common/protoheader";
import { toHex } from "../../scryptlib";
export const PROTO_VERSION = 1;

const NFT_ID_LEN = 20;
const SATOSHIS_PRICE_LEN = 8;
const SELLER_ADDRESS_LEN = 20;
const TOKEN_INDEX_LEN = 8;
const GENESIS_LEN = 20;
const CODEHASH_LEN = 20;

const NFT_ID_OFFSET = NFT_ID_LEN + proto.getHeaderLen();
const SATOSHIS_PRICE_OFFSET = SATOSHIS_PRICE_LEN + NFT_ID_OFFSET;
const SELLER_ADDRESS_OFFSET = SELLER_ADDRESS_LEN + SATOSHIS_PRICE_OFFSET;
const TOKEN_INDEX_OFFSET = TOKEN_INDEX_LEN + SELLER_ADDRESS_OFFSET;
const GENESIS_OFFSET = GENESIS_LEN + TOKEN_INDEX_OFFSET;
const CODEHASH_OFFSET = CODEHASH_LEN + GENESIS_OFFSET;

export function getNftID(script: Buffer) {
  return toHex(
    script.slice(
      script.length - NFT_ID_OFFSET,
      script.length - NFT_ID_OFFSET + NFT_ID_LEN
    )
  );
}

export function getSatoshisPrice(script: Buffer): BN {
  if (script.length < SATOSHIS_PRICE_OFFSET) return BN.Zero;
  return BN.fromBuffer(
    script.slice(
      script.length - SATOSHIS_PRICE_OFFSET,
      script.length - SATOSHIS_PRICE_OFFSET + SATOSHIS_PRICE_LEN
    ),
    { endian: "little" }
  );
}

export function getSellerAddress(script: Buffer) {
  if (script.length < SELLER_ADDRESS_OFFSET) return "";
  return script
    .slice(
      script.length - SELLER_ADDRESS_OFFSET,
      script.length - SELLER_ADDRESS_OFFSET + SELLER_ADDRESS_LEN
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

export function getGenesis(script: Buffer) {
  if (script.length < GENESIS_OFFSET) return "";
  return script
    .slice(
      script.length - GENESIS_OFFSET,
      script.length - GENESIS_OFFSET + GENESIS_LEN
    )
    .toString("hex");
}

export function getCodeHash(script: Buffer) {
  if (script.length < CODEHASH_OFFSET) return "";
  return script
    .slice(
      script.length - CODEHASH_OFFSET,
      script.length - CODEHASH_OFFSET + CODEHASH_LEN
    )
    .toString("hex");
}

export type FormatedDataPart = {
  codehash: string;
  genesis: string;
  tokenIndex: BN;
  sellerAddress: string;
  satoshisPrice: BN;
  nftID: string;
  protoVersion?: number;
  protoType?: proto.PROTO_TYPE;
};

export function newDataPart({
  codehash,
  genesis,
  tokenIndex,
  sellerAddress,
  satoshisPrice,
  nftID,
  protoVersion,
  protoType,
}: FormatedDataPart): Buffer {
  const codehashBuf = Buffer.alloc(20, 0);
  if (nftID) {
    codehashBuf.write(codehash, "hex");
  }

  const genesisBuf = Buffer.alloc(20, 0);
  if (nftID) {
    genesisBuf.write(genesis, "hex");
  }

  let tokenIndexBuf = Buffer.alloc(TOKEN_INDEX_LEN, 0);
  if (tokenIndex) {
    tokenIndexBuf = tokenIndex.toBuffer({ endian: "little", size: 8 });
  }

  const sellerAddressBuf = Buffer.alloc(SELLER_ADDRESS_LEN, 0);
  if (sellerAddress) {
    sellerAddressBuf.write(sellerAddress, "hex");
  }

  let priceBuf = Buffer.alloc(SATOSHIS_PRICE_LEN, 0);
  if (satoshisPrice) {
    priceBuf = satoshisPrice.toBuffer({ endian: "little", size: 8 });
  }

  const nftIDBuf = Buffer.alloc(NFT_ID_LEN, 0);
  if (nftID) {
    nftIDBuf.write(nftID, "hex");
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
    codehashBuf,
    genesisBuf,
    tokenIndexBuf,
    sellerAddressBuf,
    priceBuf,
    nftIDBuf,
    protoVersionBuf,
    protoTypeBuf,
    proto.PROTO_FLAG,
  ]);
}

export function parseDataPart(scriptBuf: Buffer): FormatedDataPart {
  let codehash = getCodeHash(scriptBuf);
  let genesis = getGenesis(scriptBuf);
  let tokenIndex = getTokenIndex(scriptBuf);
  let sellerAddress = getSellerAddress(scriptBuf);
  let satoshisPrice = getSatoshisPrice(scriptBuf);
  let nftID = getNftID(scriptBuf);
  let protoVersion = proto.getProtoVersioin(scriptBuf);
  let protoType = proto.getProtoType(scriptBuf);
  return {
    codehash,
    genesis,
    tokenIndex,
    sellerAddress,
    satoshisPrice,
    nftID,
    protoVersion,
    protoType,
  };
}
