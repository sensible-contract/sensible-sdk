"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserNet = void 0;
const Utils = require("./utils");
class BrowserNet {
    static _xmlRequest(reqConfig, callback) {
        const { uri, method, timeout, body } = reqConfig;
        let hasCallbacked = false;
        var xhr = new XMLHttpRequest(); //创建XMLHttpRequest对象
        xhr.open(method, uri, true); //设置和服务器交互的参数
        xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        xhr.onreadystatechange = function () {
            //注册回调的方法，发送成功后执行
            if (hasCallbacked)
                return;
            var response = xhr.responseText;
            if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status <= 207) {
                hasCallbacked = true;
                callback(null, response);
            }
            else {
                if (xhr.status == 200) {
                }
                else {
                    hasCallbacked = true;
                    callback("EC_REQ_FAILED");
                }
            }
        };
        xhr.ontimeout = function (argument) {
            if (hasCallbacked)
                return;
            hasCallbacked = true;
            callback("EC_REQ_TIMEOUT");
        };
        xhr.onerror = function () {
            if (hasCallbacked)
                return;
            hasCallbacked = true;
            callback("EC_REQ_FAILED");
        };
        xhr.timeout = timeout;
        if (method == "POST") {
            xhr.send(body);
        }
        else {
            xhr.send();
        }
    }
    static httpGet(url, params, cb) {
        let str = "";
        let cnt = 0;
        for (var id in params) {
            if (cnt != 0)
                str += "&";
            str += id + "=" + params[id];
            cnt++;
        }
        const reqData = {
            uri: url,
            method: "GET",
            timeout: 180000,
        };
        const handlerCallback = (resolve, reject) => {
            this._xmlRequest(reqData, (err, body) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (typeof body == "string") {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (e) { }
                }
                resolve(body);
            });
        };
        if (typeof cb === "function") {
            handlerCallback((result) => Utils.invokeCallback(cb, null, result), (err) => Utils.invokeCallback(cb, err));
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
        }
        else if (contentType == "text") {
            postData = params;
            headers["content-type"] = "text/plain";
        }
        else {
            postData = JSON.stringify(params);
            headers["content-type"] = "application/json";
        }
        let bodyString = Buffer.from(postData);
        headers["content-length"] = bodyString.length;
        if (authorization)
            headers["authorization"] = authorization;
        const reqData = {
            uri: url,
            method: "POST",
            body: postData,
            headers: headers,
            timeout: timeout,
        };
        const handlerCallback = (resolve, reject) => {
            this._xmlRequest(reqData, (err, body) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (typeof body == "string") {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (e) { }
                }
                resolve(body);
            });
        };
        if (typeof cb === "function") {
            handlerCallback((result) => Utils.invokeCallback(cb, null, result), (err) => Utils.invokeCallback(cb, err));
            return;
        }
        return new Promise((resolve, reject) => {
            handlerCallback(resolve, reject);
        });
    }
}
exports.BrowserNet = BrowserNet;
