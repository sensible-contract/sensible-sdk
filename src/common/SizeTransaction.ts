import { DustCalculator } from "./DustCalculator";
function getVariableSize(n: number) {
  if (n < 0xfd) {
    return 1;
  } else if (n < 0x10000) {
    return 2 + 1;
  } else if (n < 0x100000000) {
    return 3 + 1;
  } else if (n < 0x10000000000000000) {
    return 4 + 1;
  }
}

enum OutputType {
  P2PKH,
  OP_RETURN,
  OTHER,
}

type Output = {
  size: number;
  type: OutputType;
};

enum InputType {
  P2PKH,
  OTHER,
}

type Input = {
  size: number;
  type: InputType;
  satothis?: number;
};

export class SizeTransaction {
  feeRate: number;
  dustCalculator: DustCalculator;
  inputs: Input[] = [];
  outputs: Output[] = [];
  constructor(feeRate: number, dustCalculator: DustCalculator) {
    this.feeRate = feeRate;
    this.dustCalculator = dustCalculator;
  }

  addInput(unlockingScriptSize: number, satothis: number) {
    this.inputs.push({
      size: unlockingScriptSize,
      type: InputType.OTHER,
      satothis,
    });
  }

  addP2PKHInput() {
    this.inputs.push({ size: 107, type: InputType.P2PKH });
  }

  addOutput(lockingScriptSize: number) {
    this.outputs.push({ size: lockingScriptSize, type: OutputType.OTHER });
  }

  addOpReturnOutput(lockingScriptSize: number) {
    this.outputs.push({ size: lockingScriptSize, type: OutputType.OP_RETURN });
  }

  addP2PKHOutput() {
    this.outputs.push({ size: 25, type: OutputType.P2PKH });
  }

  getSize() {
    let sizeSum = 0;
    sizeSum += 4; //nVersionSize
    sizeSum += 1; //vinNum(vins should not more than 255)
    this.inputs.forEach((input) => {
      sizeSum += 32; //txid
      sizeSum += 4; //outputINex
      sizeSum += getVariableSize(input.size); //unlocking script length
      sizeSum += input.size; //unlocking script
      sizeSum += 4; //nSequence
    });
    sizeSum += 1; //voutNum
    this.outputs.forEach((output) => {
      sizeSum += 8; // satothis
      sizeSum += getVariableSize(output.size); //locking script length
      sizeSum += output.size; //locking script
    });
    sizeSum += 4; //nLockTime
    return sizeSum;
  }

  getFee() {
    let fee = 0;
    fee += Math.ceil(this.getSize() * this.feeRate);
    this.inputs.forEach((input) => {
      if (input.type == InputType.OTHER) {
        fee -= input.satothis;
      }
    });
    this.outputs.forEach((output) => {
      if (output.type == OutputType.OTHER) {
        fee += this.dustCalculator.getDustThreshold(output.size);
      }
    });

    return Math.ceil(fee);
  }
}
