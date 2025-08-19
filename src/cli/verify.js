import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD = path.join(__dirname, "../../build/circuits");

console.log("Verifying proof...");
execSync(`npx snarkjs groth16 verify ${BUILD}/verification_key.json ${BUILD}/public.json ${BUILD}/proof.json`, { stdio: "inherit" });
console.log("✅ Verification OK");
