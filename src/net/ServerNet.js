const { Utils } = require("./utils");

class ServerNet {
  static httpGet(url, params, cb) {
    let str = "";
    let cnt = 0;
    for (var id in params) {
      if (cnt != 0) str += "&";
      str += id + "=" + params[id];
      cnt++;
    }
    const reqData = {
      uri: url,
      method: "GET",
      timeout: 180000,
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
            reject({
              reqData,
              resData: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                body,
              },
            });
          }
        } else {
          reject({
            reqData,
            resData: err,
          });
        }
      });
    };

    if (typeof cb === "function") {
      handlerCallback(
        (result) => Utils.invokeCallback(cb, null, result),
        (err) => Utils.invokeCallback(cb, err)
      );
      return;
    }

    return new Promise((resolve, reject) => {
      handlerCallback(resolve, reject);
    });
  }

  static httpPost(url, params, cb, config) {
    let postData = "";
    let headers = {};

    config = config || {};
    let { contentType, timeout, authorization } = config;
    contentType = contentType || "json";
    timeout = timeout || 180000;

    if (contentType == "urlencoded") {
      let arr = [];
      for (var id in params) {
        arr.push(`${id}=${params[id]}`);
      }
      postData = arr.join("&");
      headers["content-type"] = "application/x-www-form-urlencoded";
    } else if (contentType == "text") {
      postData = params;
      headers["content-type"] = "text/plain";
    } else {
      postData = JSON.stringify(params);
      headers["content-type"] = "application/json";
    }
    let bodyString = Buffer.from(postData);
    headers["content-length"] = bodyString.length;
    if (authorization) headers["authorization"] = authorization;
    const reqData = {
      uri: url,
      method: "POST",
      body: postData,
      headers: headers,
      timeout: timeout,
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
            reject({
              reqData,
              resData: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                body,
              },
            });
          }
        } else {
          reject({
            reqData,
            resData: err,
          });
        }
      });
    };

    if (typeof cb === "function") {
      handlerCallback(
        (result) => Utils.invokeCallback(cb, null, result),
        (err) => Utils.invokeCallback(cb, err)
      );
      return;
    }

    return new Promise((resolve, reject) => {
      handlerCallback(resolve, reject);
    });
  }
}

module.exports = {
  ServerNet,
};
