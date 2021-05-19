"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Net = void 0;
const BrowserNet_1 = require("./BrowserNet");
const ServerNet_1 = require("./ServerNet");
class Net {
    static httpGet(url, params) {
        let _process = process;
        if (!_process.browser) {
            return ServerNet_1.ServerNet.httpGet(url, params);
        }
        else {
            return BrowserNet_1.BrowserNet.httpGet(url, params);
        }
    }
    static httpPost(url, params) {
        let _process = process;
        if (!_process.browser) {
            return ServerNet_1.ServerNet.httpPost(url, params);
        }
        else {
            return BrowserNet_1.BrowserNet.httpPost(url, params);
        }
    }
}
exports.Net = Net;
