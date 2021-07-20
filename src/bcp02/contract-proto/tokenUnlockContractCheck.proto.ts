import * as BN from "../../bn.js";
import * as bsv from "../../bsv";
import * as TokenUtil from "../../common/tokenUtil";
const NFT_ID_LEN = 36;
const NFT_CODE_HASH_LEN = 20;
const NFT_ID_OFFSET = 0 + NFT_ID_LEN;
const NFT_CODE_HASH_OFFSET = NFT_ID_OFFSET + NFT_CODE_HASH_LEN;
// opreturn + inputTokenIndexArray + nSenders(4 bytes) + receiverTokenAmountArray + receiverArray + nReceivers(4 bytes) + tokenCodeHash + tokenID

export type FormatedDataPart = {
  inputTokenIndexArray?: number[];
  nSender?: number;
  receiverTokenAmountArray?: BN[];
  receiverArray?: bsv.Address[];
  nReceivers?: number;
  tokenCodeHash?: string;
  tokenID?: string;
};

export function newDataPart(dataPart: FormatedDataPart): Buffer {
  let inputTokenIndexArrayBuf = Buffer.alloc(0);
  dataPart.inputTokenIndexArray.forEach((tokenIndex) => {
    inputTokenIndexArrayBuf = Buffer.concat([
      inputTokenIndexArrayBuf,
      TokenUtil.getUInt32Buf(tokenIndex),
    ]);
  });

  let receiverTokenAmountArrayBuf = Buffer.alloc(0);
  dataPart.receiverTokenAmountArray.forEach((tokenAmount) => {
    receiverTokenAmountArrayBuf = Buffer.concat([
      receiverTokenAmountArrayBuf,
      tokenAmount.toBuffer({ endian: "little", size: 8 }),
    ]);
  });
  let recervierArrayBuf = Buffer.alloc(0);
  dataPart.receiverArray.map((address) => {
    recervierArrayBuf = Buffer.concat([recervierArrayBuf, address.hashBuffer]);
  });
  let nReceiversBuf = TokenUtil.getUInt32Buf(dataPart.nReceivers);
  let tokenCodeHashBuf = Buffer.from(dataPart.tokenCodeHash, "hex");
  let tokenIDBuf = Buffer.from(dataPart.tokenID, "hex");
  return Buffer.concat([
    inputTokenIndexArrayBuf,
    receiverTokenAmountArrayBuf,
    recervierArrayBuf,
    nReceiversBuf,
    tokenCodeHashBuf,
    tokenIDBuf,
  ]);
}
