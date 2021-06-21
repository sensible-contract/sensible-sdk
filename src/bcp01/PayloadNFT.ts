import { Ripemd160 } from "scryptlib";
import BN = require("../bn.js");
export const ISSUE = 0;
export const TRANSFER = 1;

const PROTO_TYPE_LEN = 1;
const META_TXID_LEN = 32;
const TOKEN_ID_LEN = 8;
const TOTAL_SUPPLY_LEN = 8;
const PKH_LEN = 20;

/**
 * PayloadNFT
 */
export class PayloadNFT {
  dataType: number;
  ownerPkh: Ripemd160 | Buffer;
  tokenId: BN;
  metaTxId: string;
  totalSupply: BN;
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
  constructor({
    dataType,
    ownerPkh,
    tokenId,
    totalSupply,
    metaTxId,
  }: {
    dataType?: number;
    ownerPkh?: Ripemd160;
    tokenId?: BN;
    totalSupply?: BN;
    metaTxId?: string;
  } = {}) {
    this.dataType = dataType || 0;
    this.metaTxId =
      metaTxId || "000000000000000000000000000000000000000000000000000000";
    this.ownerPkh =
      ownerPkh || new Ripemd160("0000000000000000000000000000000000000000");
    this.totalSupply = totalSupply || BN.Zero;
    this.tokenId = tokenId || BN.Zero;
  }

  read(script: Buffer) {
    let dataTypeOffset = script.length - PROTO_TYPE_LEN;
    let dataType = script.readUIntLE(dataTypeOffset, PROTO_TYPE_LEN);

    if (dataType == 0) {
      let totalSupplyOffset = dataTypeOffset - TOTAL_SUPPLY_LEN;
      let totalSupply = BN.fromBuffer(
        script.slice(totalSupplyOffset, totalSupplyOffset + 8),
        { endian: "little" }
      );
      let tokenIdOffset = totalSupplyOffset - TOKEN_ID_LEN;
      let tokenId = BN.fromBuffer(
        script.slice(tokenIdOffset, tokenIdOffset + 8),
        { endian: "little" }
      );
      let ownerPkhOffset = tokenIdOffset - PKH_LEN;
      let ownerPkh = script.slice(ownerPkhOffset, ownerPkhOffset + PKH_LEN);

      this.dataType = dataType;
      this.totalSupply = totalSupply;
      this.tokenId = tokenId;
      this.ownerPkh = ownerPkh;
    } else if (dataType == 1) {
      let metaTxIdOffset = dataTypeOffset - META_TXID_LEN;
      let metaTxId = script
        .slice(metaTxIdOffset, metaTxIdOffset + META_TXID_LEN)
        .toString("hex");
      let tokenIdOffset = metaTxIdOffset - TOKEN_ID_LEN;
      let tokenId = BN.fromBuffer(
        script.slice(tokenIdOffset, tokenIdOffset + 8),
        { endian: "little" }
      );
      let ownerPkhOffset = tokenIdOffset - PKH_LEN;
      let ownerPkh = script.slice(ownerPkhOffset, ownerPkhOffset + PKH_LEN);

      this.dataType = dataType;
      this.metaTxId = metaTxId;
      this.tokenId = tokenId;
      this.ownerPkh = ownerPkh;
    }
  }

  dump(): string {
    let payloadBuf: Buffer;

    if (this.dataType == ISSUE) {
      const ownerPkhBuf = this.ownerPkh as Buffer;

      const tokenIdBuf = this.tokenId.toBuffer({ endian: "little", size: 8 });
      const totalSupplyBuf = this.totalSupply.toBuffer({
        endian: "little",
        size: 8,
      });

      const dataTypeBuf = Buffer.alloc(PROTO_TYPE_LEN, 0);
      dataTypeBuf.writeUIntLE(this.dataType, 0, PROTO_TYPE_LEN);
      payloadBuf = Buffer.concat([
        ownerPkhBuf,
        tokenIdBuf,
        totalSupplyBuf,
        dataTypeBuf,
      ]);
    } else if (this.dataType == TRANSFER) {
      const ownerPkhBuf = this.ownerPkh as Buffer;

      const tokenIdBuf = this.tokenId.toBuffer({ endian: "little", size: 8 });

      const metaTxIdBuf = Buffer.from(this.metaTxId, "hex");

      const dataTypeBuf = Buffer.alloc(PROTO_TYPE_LEN, 0);
      dataTypeBuf.writeUIntLE(this.dataType, 0, PROTO_TYPE_LEN);

      payloadBuf = Buffer.concat([
        ownerPkhBuf,
        tokenIdBuf,
        metaTxIdBuf,
        dataTypeBuf,
      ]);
    }

    return payloadBuf.toString("hex");
  }
}
