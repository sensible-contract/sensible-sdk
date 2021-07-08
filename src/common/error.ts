export class CodeError extends Error {
  code: number;
  message: any;
  constructor(code: number, msg?: any) {
    super(msg);
    this.code = code;
    if (msg) {
      this.message = msg;
    } else {
      this.message = "CodeError:" + code;
    }
  }
}

export enum ErrCode {
  EC_OK = 0,
  EC_INNER_ERROR = -1,
  EC_INVALID_ARGUMENT = -2,
  EC_SENSIBLE_API_ERROR = -3,

  //需要特殊处理
  EC_UTXOS_MORE_THAN_3 = -100,
  EC_TOO_MANY_FT_UTXOS = -101,
  EC_FIXED_TOKEN_SUPPLY = -102,

  //金额不足
  EC_INSUFFICENT_BSV = -200,
  EC_INSUFFICENT_FT = -201,
}

export const ErrInfo = {
  InvalidArgument: {
    code: ErrCode.EC_INVALID_ARGUMENT,
    message: "",
  },
};
