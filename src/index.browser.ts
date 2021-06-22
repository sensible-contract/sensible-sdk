/**
 * When we browserify the source, buffer in elliptic/node_modules/bn.js is null.
 * Add the code to fix that.
 */
if (typeof globalThis.window !== "undefined") {
  var window: any = globalThis.window;
  if (typeof window.Buffer == "undefined") {
    const Buffer = require("buffer/index").Buffer;
    window.Buffer = Buffer;
  }
}

export { SensibleNFT } from "./bcp01";
export { SensibleFT } from "./bcp02";
export { Net } from "./net";
export { API_NET, API_TARGET, SensibleApi } from "./sensible-api";
