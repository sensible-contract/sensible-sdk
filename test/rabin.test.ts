import { expect } from "chai";
import * as rabin from "./rabin";
describe("Rabin Test", () => {
  it("rabin verify should be ok", () => {
    let msg = "0xff00ff00ff00ff00ff00ff0ff";
    let { p, q } = rabin.generatePrivKey();
    let rabinPubKey = rabin.privKeyToPubKey(p, q);
    let { signature, padding } = rabin.sign(msg, p, q, rabinPubKey);
    let result = rabin.verify(msg, padding, signature, rabinPubKey);
    expect(result).to.be.true;
  });
});
