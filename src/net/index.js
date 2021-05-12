const { BrowserNet } = require("./BrowserNet");
const { ServerNet } = require("./ServerNet");
class Net {
  static httpGet(url, params) {
    if (!process.browser) {
      return ServerNet.httpGet(url, params);
    } else {
      return BrowserNet.httpGet(url, params);
    }
  }

  static httpPost(url, params) {
    if (!process.browser) {
      return ServerNet.httpPost(url, params);
    } else {
      return BrowserNet.httpPost(url, params);
    }
  }
}
module.exports = {
  Net,
};
