const { num2bin, Ripemd160, Sha256, toHex } = require("scryptlib");
const ISSUE = 0;
const TRANSFER = 1;

const PROTO_TYPE_LEN = 1;
const META_TXID_LEN = 32;
const TOKEN_ID_LEN = 8;
const TOTAL_SUPPLY_LEN = 8;
const PKH_LEN = 20;

const issuePrefix = "25";
const transferPrefix = "3d";
/**
 * PayloadNFT
 */
class PayloadNFT {
  /**
   * 解析、构造NFT合约的数据部分
   *
   * @constructor
   *
   * @param {Object} params
   * @param {string} params.dataType 数据类型，1字节
   * @param {Ripemd160} params.ownerPkh 所属人
   * @param {number} params.tokenId tokenId
   * @param {string} params.metaTxId meta txid
   * @param {number=} params.totalSupply 发行总量
   */
  constructor({ dataType, ownerPkh, tokenId, totalSupply, metaTxId } = {}) {
    this.dataType = dataType || 0;
    this.metaTxId =
      metaTxId || "000000000000000000000000000000000000000000000000000000";
    this.ownerPkh = ownerPkh || Buffer.alloc(20, 0);
    this.totalSupply = totalSupply || 0n;
    this.tokenId = tokenId || 0n;
  }

  read(script) {
    let dataTypeOffset = script.length - PROTO_TYPE_LEN;
    let dataType = script.readUIntLE(dataTypeOffset, PROTO_TYPE_LEN);

    if (dataType == 0) {
      let totalSupplyOffset = dataTypeOffset - TOTAL_SUPPLY_LEN;
      let totalSupply = script.readBigUInt64LE(
        totalSupplyOffset,
        TOTAL_SUPPLY_LEN
      );
      let tokenIdOffset = totalSupplyOffset - TOKEN_ID_LEN;
      let tokenId = script.readBigUInt64LE(tokenIdOffset, TOKEN_ID_LEN);
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
      let tokenId = script.readBigUInt64LE(tokenIdOffset, TOKEN_ID_LEN);
      let ownerPkhOffset = tokenIdOffset - PKH_LEN;
      let ownerPkh = script.slice(ownerPkhOffset, ownerPkhOffset + PKH_LEN);

      this.dataType = dataType;
      this.metaTxId = metaTxId;
      this.tokenId = tokenId;
      this.ownerPkh = ownerPkh;
    }
  }

  dump() {
    let payloadBuf;

    if (this.dataType == ISSUE) {
      const ownerPkhBuf = this.ownerPkh;

      const tokenIdBuf = Buffer.alloc(TOKEN_ID_LEN, 0);
      tokenIdBuf.writeBigUInt64LE(this.tokenId);

      const totalSupplyBuf = Buffer.alloc(TOTAL_SUPPLY_LEN, 0);
      totalSupplyBuf.writeBigUInt64LE(this.totalSupply);

      const dataTypeBuf = Buffer.alloc(PROTO_TYPE_LEN, 0);
      dataTypeBuf.writeUIntLE(this.dataType, 0, PROTO_TYPE_LEN);
      payloadBuf = Buffer.concat([
        ownerPkhBuf,
        tokenIdBuf,
        totalSupplyBuf,
        dataTypeBuf,
      ]);
    } else if (this.dataType == TRANSFER) {
      const ownerPkhBuf = this.ownerPkh;

      const tokenIdBuf = Buffer.alloc(TOKEN_ID_LEN, 0);
      tokenIdBuf.writeBigUInt64LE(this.tokenId);

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

module.exports = {
  ISSUE,
  TRANSFER,
  issuePrefix,
  transferPrefix,
  PayloadNFT,
};
