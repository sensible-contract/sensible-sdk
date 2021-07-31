import * as Utils from "./utils";
type HttpConfig = {
  timeout?: number;
  headers?: any;
};
export class ServerNet {
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
    config = config || {};
    let headers = config.headers || {};
    let timeout = config.timeout || 180000;
    let reqData = {
      uri: url,
      method: "GET",
      timeout,
      gzip: true,
      headers,
    };

    const handlerCallback = (resolve: Function, reject: Function) => {
      require("request")(reqData, function (err: any, res: any, body: any) {
        if (!err) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (typeof body == "string") {
              try {
                body = JSON.parse(body);
              } catch (e) {}
            }
            resolve(body);
          } else {
            console.log("request failed.", reqData);
            reject(
              new Error(
                `RequestError: statuCode:${res.statusCode} statusMessage:${res.statusMessage} body:${body}`
              )
            );
          }
        } else {
          console.log("request failed.", reqData);
          reject(err);
        }
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

  static async httpPost(
    url: string,
    params: any,
    cb?: Function,
    config?: HttpConfig
  ) {
    let postData: any;
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
    if (headers["content-encoding"] == "gzip") {
      postData = await Utils.gzip(Buffer.from(postData));
    }

    const reqData = {
      uri: url,
      method: "POST",
      body: postData,
      headers: headers,
      timeout: timeout,
      gzip: true,
    };
    const handlerCallback = (resolve, reject) => {
      require("request")(reqData, function (err, res, body) {
        if (!err) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (typeof body == "string") {
              try {
                body = JSON.parse(body);
              } catch (e) {}
            }
            resolve(body);
          } else {
            console.log("request failed.", reqData);
            reject(
              new Error(
                `RequestError: statuCode:${res.statusCode} statusMessage:${res.statusMessage} body:${body}`
              )
            );
          }
        } else {
          console.log("request failed.", reqData);
          reject(err);
        }
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
