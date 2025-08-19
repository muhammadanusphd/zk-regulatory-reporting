import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import crypto from "crypto";
import { poseidon1, poseidon2 } from "poseidon-lite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD = path.join(__dirname, "../../build/circuits");
const WASM = path.join(BUILD, "aml_verifier_js/aml_verifier.wasm");
const ZKEY = path.join(BUILD, "aml_verifier_final.zkey");
const WITNESS = path.join(BUILD, "witness.wtns");
const INPUT = path.join(BUILD, "input.json");

if (!fs.existsSync(WASM) || !fs.existsSync(ZKEY)) {
  console.error("Missing build artifacts. Run: npm run setup:ptau && npm run build:circuits");
  process.exit(1);
}

// Synthetic demo inputs
const threshold = 10_000n;
const amount = 2500n;
const nonce = BigInt("0x" + crypto.randomBytes(31).toString("hex"));
const attr1 = 123456789n; // e.g., institution userId commitment pieces
const attr2 = 987654321n;

// Build demo KYC Merkle tree off-chain (toy): a list of leaves; our leaf at index 3
const depth = 16;
const totalLeaves = 1 << 4; // 16 leaves for small demo
const leaves = new Array(totalLeaves).fill(0).map((_, i) => {
  const a1 = BigInt(i + 1);
  const a2 = BigInt(1000 + i);
  return poseidon2([a1, a2]);
});
const myLeaf = poseidon2([attr1, attr2]);
leaves[3] = myLeaf;

// Build poseidon-based tree
function buildTree(levelLeaves) {
  const levels = [levelLeaves];
  while (levels[levels.length - 1].length > 1) {
    const curr = levels[levels.length - 1];
    const next = [];
    for (let i = 0; i < curr.length; i += 2) {
      const left = curr[i] || 0n;
      const right = curr[i + 1] || 0n;
      next.push(poseidon2([left, right]));
    }
    levels.push(next);
  }
  return levels;
}
const levels = buildTree(leaves);
const root = levels[levels.length - 1][0];

// Merkle path for index 3
function merklePath(levels, index) {
  const path = [];
  const pathIndex = [];
  let idx = index;
  for (let l = 0; l < levels.length - 1; l++) {
    const level = levels[l];
    const isRight = idx % 2 === 1;
    const sibling = isRight ? level[idx - 1] : level[idx + 1];
    path.push(sibling ?? 0n);
    pathIndex.push(isRight ? 1n : 0n);
    idx = Math.floor(idx / 2);
  }
  return { path, pathIndex };
}
const { path: kyc_path, pathIndex: kyc_pathIndex } = merklePath(levels, 3);

// Sanctions “non-membership” bit
const isSanctioned = 0n;

// tx commitment: Poseidon(amount, nonce)
const txCommit = poseidon2([amount, nonce]);

const input = {
  pub_threshold: threshold.toString(),
  pub_kyc_root: root.toString(),
  pub_sanctions_root: "0",           // toy root
  pub_tx_commitment: txCommit.toString(),

  priv_amount: amount.toString(),
  priv_user_attr1: attr1.toString(),
  priv_user_attr2: attr2.toString(),
  priv_tx_nonce: nonce.toString(),

  kyc_path: kyc_path.map(String),
  kyc_pathIndex: kyc_pathIndex.map(String),

  priv_is_sanctioned: isSanctioned.toString()
};

fs.writeFileSync(INPUT, JSON.stringify(input, null, 2));

console.log("Generating witness...");
execSync(`npx snarkjs wtns calculate ${WASM} ${INPUT} ${WITNESS}`, { stdio: "inherit" });

console.log("Proving...");
execSync(`npx snarkjs groth16 prove ${ZKEY} ${WITNESS} ${BUILD}/proof.json ${BUILD}/public.json`, { stdio: "inherit" });

console.log("Proof generated:");
console.log("- proof:", path.join(BUILD, "proof.json"));
console.log("- public signals:", path.join(BUILD, "public.json"));
