import { SensibleNFT } from "../bcp01";
import { SensibleFT } from "../bcp02";
import * as bsv from "../bsv";
import * as proto from "../common/protoheader";
import { API_NET } from "../sensible-api";
export enum OutputType {
  SENSIBLE_NFT,
  SENSIBLE_FT,
  P2PKH,
  OP_RETURN,
  UNKNOWN,
}
export class TxDecoder {
  static decodeTxHex(txHex: string, network: API_NET = API_NET.MAIN) {
    let tx = new bsv.Transaction(txHex);

    let outputs = [];
    tx.outputs.forEach((v) => {
      let scriptBuf = v.script.toBuffer();
      if (proto.hasProtoFlag(scriptBuf)) {
        let protoType = proto.getProtoType(scriptBuf);
        if (protoType == proto.PROTO_TYPE.NFT) {
          outputs.push({
            type: OutputType.SENSIBLE_NFT,
            satoshis: v.satoshis,
            data: SensibleNFT.parseTokenScript(scriptBuf, network),
          });
        } else if (protoType == proto.PROTO_TYPE.FT) {
          outputs.push({
            type: OutputType.SENSIBLE_FT,
            satoshis: v.satoshis,
            data: SensibleFT.parseTokenScript(scriptBuf, network),
          });
        } else {
          outputs.push({
            type: OutputType.UNKNOWN,
            satoshis: v.satoshis,
          });
        }
      } else if (v.script.isPublicKeyHashOut()) {
        outputs.push({
          type: OutputType.P2PKH,
          satoshis: v.satoshis,
        });
      } else if (v.script.isSafeDataOut()) {
        outputs.push({
          type: OutputType.OP_RETURN,
          satoshis: 0,
        });
      }
    });

    return {
      txId: tx.id,
      outputs,
    };
  }
}
