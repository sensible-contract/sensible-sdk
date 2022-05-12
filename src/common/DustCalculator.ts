export class DustCalculator {
  dustLimitFactor: number;
  dustAmount: number = null;
  constructor(dustLimitFactor: number, dustAmount: number) {
    this.dustLimitFactor = dustLimitFactor;
    this.dustAmount = dustAmount;
  }

  getDustThreshold(s: number) {
    return 1;
    // if (!Utils.isNull(this.dustAmount)) {
    //   return this.dustAmount;
    // } else {
    //   return Math.ceil(
    //     (Math.ceil((250 * (s + 9 + 148)) / 1000) * this.dustLimitFactor) / 100
    //   );
    // }
  }
}
