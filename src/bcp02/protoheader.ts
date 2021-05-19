export const PROTO_FLAG = Buffer.from("sensible");
export const PROTO_FLAG_LEN = PROTO_FLAG.length;
export const TYPE_LEN = 4;
export const TYPE_OFFSET = PROTO_FLAG_LEN + TYPE_LEN;
export const HEADER_LEN = TYPE_OFFSET;

export function getHeaderLen() {
  return HEADER_LEN;
}

export function getFlag(script: Buffer) {
  return script.slice(script.length - PROTO_FLAG_LEN, script.length);
}

export function getHeaderType(script: Buffer) {
  return script.readUIntLE(script.length - TYPE_OFFSET, TYPE_LEN);
}

export function HasProtoFlag(script: Buffer) {
  const flag = getFlag(script);
  if (flag.compare(PROTO_FLAG) === 0) {
    return true;
  }
  return false;
}
