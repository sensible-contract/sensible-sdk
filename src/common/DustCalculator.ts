import * as Utils from "./utils";
export class DustCalculator {
  dustRate: number = null;
  dustAmount: number = null;
  constructor(dustRate: number, dustAmount: number) {
    this.dustRate = dustRate;
    this.dustAmount = dustAmount;
  }

  getDustThreshold(s: number) {
    if (!Utils.isNull(this.dustAmount)) {
      return this.dustAmount;
    } else {
      return Math.ceil((s + 148) * this.dustRate);
    }
  }
}
