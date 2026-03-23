const { execFileSync } = require("node:child_process");
const { resolve } = require("node:path");
const { rmSync } = require("node:fs");

const rootDir = resolve(__dirname, "..");
const buildDir = resolve(rootDir, ".contract-test-build", "src");
const tsconfigPath = resolve(rootDir, "tsconfig.contract-tests.json");
const testPath = resolve(rootDir, "tests", "contract.test.cjs");

let tscPath = process.env.PIAXIS_TSC_BIN;
if (!tscPath) {
  tscPath = require.resolve("typescript/bin/tsc", { paths: [rootDir] });
}

rmSync(buildDir, { recursive: true, force: true });

execFileSync(process.execPath, [tscPath, "-p", tsconfigPath], {
  cwd: rootDir,
  stdio: "inherit",
});

execFileSync(process.execPath, ["--test", testPath], {
  cwd: rootDir,
  stdio: "inherit",
});
