import { CodeError, ErrCode } from "./error";

export function checkArgument(condition: any, message?: string) {
  if (!condition) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `Invalid Argument: ` + message
    );
  }
}
