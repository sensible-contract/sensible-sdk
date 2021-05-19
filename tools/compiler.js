const { compile } = require("scryptlib");
const { basename, join } = require("path");
const { unlinkSync, existsSync } = require("fs");
const { glob } = require("glob");
let isDebug = false;
if (process.argv.includes("--debug")) {
  isDebug = true;
}

let protocolName;
if (process.argv.includes("--bcp01")) {
  protocolName = "bcp01";
} else if (process.argv.includes("--bcp02")) {
  protocolName = "bcp02";
}
const contractScryptPath = join(__dirname, "../src/", protocolName, "contract");
const contractJsonPath = join(
  __dirname,
  "../src/",
  protocolName,
  "contract-desc"
);

function compileContract(fileName, isDebug) {
  const filePath = join(contractScryptPath, fileName);
  const out = contractJsonPath;

  const result = compile(
    { path: filePath },
    {
      desc: true,
      debug: isDebug ? true : false,
      sourceMap: isDebug ? true : false,
      outputDir: out,
    }
  );

  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors);
    throw result.errors;
  }

  return result;
}

function compile_for(file) {
  const fileName = basename(file);
  if (fileName.endsWith(".scrypt")) {
    try {
      clean_description_file(fileName);
      compileContract(fileName, isDebug);
    } catch (error) {
      console.log(error);
    }
  }
}

function clean_description_file(fileName) {
  if (fileName.endsWith(".scrypt")) {
    try {
      const descFile = join(
        contractJsonPath,
        fileName.replace(".scrypt", "_desc.json")
      );
      if (existsSync(descFile)) {
        unlinkSync(descFile);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
glob(contractScryptPath + "/**/*.scrypt", (err, files) => {
  if (err) return;
  files.forEach((f) => {
    compile_for(f);
  });
});
