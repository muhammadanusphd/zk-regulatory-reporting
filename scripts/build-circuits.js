import { execSync } from "child_process";
import { mkdirSync } from "fs";

mkdirSync("build/circuits", { recursive: true });

console.log("Compiling circuits...");
execSync("npx circom src/circuits/aml_verifier.circom --r1cs --wasm --sym -o build/circuits", { stdio: "inherit" });

console.log("Setting up Groth16...");
execSync("npx snarkjs groth16 setup build/circuits/aml_verifier.r1cs build/ptau/pot12_final.ptau build/circuits/aml_verifier_0000.zkey", { stdio: "inherit" });
execSync("npx snarkjs zkey contribute build/circuits/aml_verifier_0000.zkey build/circuits/aml_verifier_final.zkey -n \"init\"", { stdio: "inherit" });
execSync("npx snarkjs zkey export verificationkey build/circuits/aml_verifier_final.zkey build/circuits/verification_key.json", { stdio: "inherit" });

console.log("Generating Solidity verifier...");
execSync("npx snarkjs zkey export solidityverifier build/circuits/aml_verifier_final.zkey src/contracts/Verifier.sol", { stdio: "inherit" });
console.log("Done.");
