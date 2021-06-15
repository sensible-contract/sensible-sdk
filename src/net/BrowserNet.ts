import * as Utils from "./utils";
type ReqConfig = {
  uri?: string;
  method?: string;
  timeout?: number;
  body?: any;
  headers?: any;
};
type HttpConfig = {
  timeout?: number;
  headers?: any;
};
export class BrowserNet {
  static _xmlRequest(reqConfig: ReqConfig, callback: Function) {
    const { uri, method, timeout, body } = reqConfig;
    let hasCallbacked = false;
    var xhr = new XMLHttpRequest(); //创建XMLHttpRequest对象
    xhr.open(method, uri, true); //设置和服务器交互的参数
    xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");
    xhr.onreadystatechange = function () {
      //注册回调的方法，发送成功后执行
      if (hasCallbacked) return;
      var response = xhr.responseText;
      if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status <= 207) {
        hasCallbacked = true;
        callback(null, response);
      } else {
        if (xhr.status == 200) {
        } else {
          hasCallbacked = true;
          callback("EC_REQ_FAILED");
        }
      }
    };
    xhr.ontimeout = function (argument) {
      if (hasCallbacked) return;
      hasCallbacked = true;
      callback("EC_REQ_TIMEOUT");
    };
    xhr.onerror = function () {
      if (hasCallbacked) return;
      hasCallbacked = true;
      callback("EC_REQ_FAILED");
    };
    xhr.timeout = timeout;
    if (method == "POST") {
      xhr.send(body);
    } else {
      xhr.send();
    }
  }
  static httpGet(url: string, params: any, cb?: Function, config?: any) {
    let str = "";
    let cnt = 0;
    for (var id in params) {
      if (cnt != 0) str += "&";
      str += id + "=" + params[id];
      cnt++;
    }
    if (str) {
      url += "?" + str;
    }
    let headers = {};
    config = config || {};
    if (config.authorization) headers["authorization"] = config.authorization;
    const reqData: ReqConfig = {
      uri: url,
      method: "GET",
      timeout: 180000,
      headers,
    };
    const handlerCallback = (resolve: Function, reject: Function) => {
      this._xmlRequest(reqData, (err: any, body: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (typeof body == "string") {
          try {
            body = JSON.parse(body);
          } catch (e) {}
        }
        resolve(body);
      });
    };

    if (typeof cb === "function") {
      handlerCallback(
        (result: any) => Utils.invokeCallback(cb, null, result),
        (err: any) => Utils.invokeCallback(cb, err)
      );
      return;
    }

    return new Promise((resolve, reject) => {
      handlerCallback(resolve, reject);
    });
  }

  static httpPost(
    url: string,
    params: any,
    cb?: Function,
    config?: HttpConfig
  ) {
    let postData = "";

    config = config || {};

    let headers = config.headers || {};
    let timeout = config.timeout || 180000;
    headers["content-type"] = headers["content-type"] || "application/json";
    if (headers["content-type"] == "application/x-www-form-urlencoded") {
      let arr = [];
      for (var id in params) {
        arr.push(`${id}=${params[id]}`);
      }
      postData = arr.join("&");
    } else if (headers["content-type"] == "text/plain") {
      postData = params;
    } else {
      postData = JSON.stringify(params);
    }
    let bodyString = Buffer.from(postData);
    headers["content-length"] = bodyString.length;
    const reqData = {
      uri: url,
      method: "POST",
      body: postData,
      headers: headers,
      timeout: timeout,
    };
    const handlerCallback = (resolve: Function, reject: Function) => {
      this._xmlRequest(reqData, (err: any, body: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (typeof body == "string") {
          try {
            body = JSON.parse(body);
          } catch (e) {}
        }
        resolve(body);
      });
    };

    if (typeof cb === "function") {
      handlerCallback(
        (result: any) => Utils.invokeCallback(cb, null, result),
        (err: any) => Utils.invokeCallback(cb, err)
      );
      return;
    }

    return new Promise((resolve, reject) => {
      handlerCallback(resolve, reject);
    });
  }
}
