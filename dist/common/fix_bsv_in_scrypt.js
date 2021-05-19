/**
 * 正式网发送OP_RETURN需要加前缀OP_FALSE
 * scryptlib当前的bsv版本还没有buildSafeDataOut方法，所以在此补充
 */

const { bsv } = require("scryptlib");
const { Script, Transaction, Opcode, errors } = bsv;

Transaction.prototype._hasDustOutputs = function (opts) {
  if (opts.disableDustOutputs) {
    return;
  }
  var index, output;
  for (index in this.outputs) {
    output = this.outputs[index];
    if (
      output.satoshis < Transaction.DUST_AMOUNT &&
      !output.script.isDataOut() &&
      !output.script.isSafeDataOut()
    ) {
      return new errors.Transaction.DustOutputs();
    }
  }
};

Script.prototype.isSafeDataOut = function () {
  if (this.chunks.length < 2) {
    return false;
  }
  if (this.chunks[0].opcodenum !== Opcode.OP_FALSE) {
    return false;
  }
  var chunks = this.chunks.slice(1);
  var script2 = new Script({ chunks });
  return script2.isDataOut();
};

/**
 * @returns {Script} a new OP_RETURN script with data
 * @param {(string|Buffer|Array)} data - the data to embed in the output - it is a string, buffer, or array of strings or buffers
 * @param {(string)} encoding - the type of encoding of the string(s)
 */
Script.buildSafeDataOut = function (data, encoding) {
  var s2 = Script.buildDataOut(data, encoding);
  var s1 = new Script();
  s1.add(Opcode.OP_FALSE);
  s1.add(s2);
  return s1;
};
