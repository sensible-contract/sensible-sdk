import { BrowserNet } from "./BrowserNet";
import { ServerNet } from "./ServerNet";

function toLowerHeader(headers) {
  let newHeaders = {};
  for (var id in headers) {
    let lowerId = id.toLowerCase();
    newHeaders[lowerId] = headers[id];
  }
  return newHeaders;
}

export class Net {
  //default timeout
  static timeout = 3 * 60 * 1000;

  static httpGet(url: string, params: any, config?: any) {
    if (config && config.headers) {
      config.headers = toLowerHeader(config.headers);
    }
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpGet(url, params, null, config);
    } else {
      if (config && config.headers) {
        //remove unsafe header,should be added in browser
        delete config.headers["accept-encoding"];
      }
      return BrowserNet.httpGet(url, params, null, config);
    }
  }

  static httpPost(url: string, params: any, config?: any) {
    if (config && config.headers) {
      config.headers = toLowerHeader(config.headers);
    }
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpPost(url, params, null, config);
    } else {
      if (config && config.headers) {
        delete config.headers["accept-encoding"];
      }
      return BrowserNet.httpPost(url, params, null, config);
    }
  }
}
