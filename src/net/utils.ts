import * as zlib from "zlib";

/**
 * Check and invoke callback function
 */
export const invokeCallback = function (...args: any[]) {
  let cb = arguments[0];
  if (!!cb && typeof cb === "function") {
    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

export async function gzip(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gzip(data, (err, val) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(val);
    });
  });
}
