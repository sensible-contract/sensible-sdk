import { BrowserNet } from "./BrowserNet";
import { ServerNet } from "./ServerNet";
export class Net {
  static httpGet(url: string, params: any) {
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpGet(url, params);
    } else {
      return BrowserNet.httpGet(url, params);
    }
  }

  static httpPost(url: string, params: any) {
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpPost(url, params);
    } else {
      return BrowserNet.httpPost(url, params);
    }
  }
}
