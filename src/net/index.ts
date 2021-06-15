import { BrowserNet } from "./BrowserNet";
import { ServerNet } from "./ServerNet";
export class Net {
  static httpGet(url: string, params: any, config?: any) {
    console.log("httpGet:", url);
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpGet(url, params, null, config);
    } else {
      return BrowserNet.httpGet(url, params, null, config);
    }
  }

  static httpPost(url: string, params: any, config?: any) {
    console.log("httpPost", url);
    let _process = process as any;
    if (!_process.browser) {
      return ServerNet.httpPost(url, params, null, config);
    } else {
      return BrowserNet.httpPost(url, params, null, config);
    }
  }
}
