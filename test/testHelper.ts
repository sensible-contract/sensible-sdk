import * as bsv from "../src/bsv";
const { Script } = bsv;
const { Interpreter } = Script;
const Interp = Interpreter;

const flags =
  Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES |
  Interp.SCRIPT_ENABLE_MONOLITH_OPCODES | // TODO: to be removed after upgrade to bsv 2.0
  Interp.SCRIPT_VERIFY_STRICTENC |
  Interp.SCRIPT_ENABLE_SIGHASH_FORKID |
  Interp.SCRIPT_VERIFY_LOW_S |
  Interp.SCRIPT_VERIFY_NULLFAIL |
  Interp.SCRIPT_VERIFY_DERSIG |
  Interp.SCRIPT_VERIFY_MINIMALDATA |
  Interp.SCRIPT_VERIFY_NULLDUMMY |
  Interp.SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS |
  Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY |
  Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY;

export function verifyTx(tx: bsv.Transaction) {
  let pass = true;
  tx.inputs.forEach((input, inputIndex) => {
    const interpreter = new Interpreter();
    var verified = interpreter.verify(
      input.script,
      input.output.script,
      tx,
      inputIndex,
      flags,
      input.output.satoshisBN
    );
    if (!verified) {
      pass = false;
      console.log("verify:", inputIndex, verified, interpreter.errstr);
    }
  });
  return pass;
}

var process = require("process");
var formatBytesToMB = function (bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + "MB";
};

export function dumpMemoryUsage() {
  let m = process.memoryUsage();
  console.log(`
rss:${formatBytesToMB(m.rss)}
heapTotal:${formatBytesToMB(m.heapTotal)}
heapUsed:${formatBytesToMB(m.heapUsed)}
external:${formatBytesToMB(m.external)}
arrayBuffers:${formatBytesToMB(m.arrayBuffers)}
	`);
  return m;
}

export function dumpMemoryUsageComparison(before) {
  let m1 = before;
  let m2 = process.memoryUsage();
  console.log(`
  rss:${formatBytesToMB(m2.rss - m1.rss)}
  heapTotal:${formatBytesToMB(m2.heapTotal - m1.heapTotal)}
  heapUsed:${formatBytesToMB(m2.heapUsed - m1.heapUsed)}
  external:${formatBytesToMB(m2.external - m1.external)}
  arrayBuffers:${formatBytesToMB(m2.arrayBuffers - m1.arrayBuffers)}
    `);
  return m2;
}
