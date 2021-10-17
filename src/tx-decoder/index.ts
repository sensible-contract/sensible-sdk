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

type DecodedOutput = {
  type: OutputType;
  satoshis: number;
  data?: any;
  address?: string;
};

export class TxDecoder {
  static decodeOutput(
    output: bsv.Transaction.Output,
    network: API_NET
  ): DecodedOutput {
    let scriptBuf = output.script.toBuffer();
    if (proto.hasProtoFlag(scriptBuf)) {
      let protoType = proto.getProtoType(scriptBuf);
      if (protoType == proto.PROTO_TYPE.NFT) {
        return {
          type: OutputType.SENSIBLE_NFT,
          satoshis: output.satoshis,
          data: SensibleNFT.parseTokenScript(scriptBuf, network),
        };
      } else if (protoType == proto.PROTO_TYPE.FT) {
        return {
          type: OutputType.SENSIBLE_FT,
          satoshis: output.satoshis,
          data: SensibleFT.parseTokenScript(scriptBuf, network),
        };
      } else {
        return {
          type: OutputType.UNKNOWN,
          satoshis: output.satoshis,
        };
      }
    } else if (output.script.isPublicKeyHashOut()) {
      return {
        type: OutputType.P2PKH,
        satoshis: output.satoshis,
        address: output.script.toAddress(network).toString(),
      };
    } else if (output.script.isSafeDataOut()) {
      return {
        type: OutputType.OP_RETURN,
        satoshis: 0,
      };
    } else {
      return {
        type: OutputType.UNKNOWN,
        satoshis: output.satoshis,
      };
    }
  }

  static decodeTx(tx: bsv.Transaction, network: API_NET = API_NET.MAIN) {
    let inputs: DecodedOutput[] = [];
    tx.inputs.forEach((v) => {
      if (v.output) {
        inputs.push(this.decodeOutput(v.output, network));
      }
    });

    let outputs: DecodedOutput[] = [];
    tx.outputs.forEach((v) => {
      outputs.push(this.decodeOutput(v, network));
    });

    let fee =
      inputs.reduce((pre, cur) => pre + cur.satoshis, 0) -
      outputs.reduce((pre, cur) => pre + cur.satoshis, 0);
    return {
      txId: tx.id,
      inputs,
      outputs,
      fee,
    };
  }
}
