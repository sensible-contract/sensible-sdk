"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HasProtoFlag = exports.getHeaderType = exports.getFlag = exports.getHeaderLen = exports.HEADER_LEN = exports.TYPE_OFFSET = exports.TYPE_LEN = exports.PROTO_FLAG_LEN = exports.PROTO_FLAG = void 0;
exports.PROTO_FLAG = Buffer.from("sensible");
exports.PROTO_FLAG_LEN = exports.PROTO_FLAG.length;
exports.TYPE_LEN = 4;
exports.TYPE_OFFSET = exports.PROTO_FLAG_LEN + exports.TYPE_LEN;
exports.HEADER_LEN = exports.TYPE_OFFSET;
function getHeaderLen() {
    return exports.HEADER_LEN;
}
exports.getHeaderLen = getHeaderLen;
function getFlag(script) {
    return script.slice(script.length - exports.PROTO_FLAG_LEN, script.length);
}
exports.getFlag = getFlag;
function getHeaderType(script) {
    return script.readUIntLE(script.length - exports.TYPE_OFFSET, exports.TYPE_LEN);
}
exports.getHeaderType = getHeaderType;
function HasProtoFlag(script) {
    const flag = getFlag(script);
    if (flag.compare(exports.PROTO_FLAG) === 0) {
        return true;
    }
    return false;
}
exports.HasProtoFlag = HasProtoFlag;
