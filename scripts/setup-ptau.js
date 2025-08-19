import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import path from "path";

const buildDir = "build/ptau";
if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });

const ptau = path.join(buildDir, "pot12_final.ptau");
if (!existsSync(ptau)) {
  console.log("Generating Powers of Tau (small demo)...");
  execSync("npx snarkjs powersoftau new bn128 12 build/ptau/pot12_0000.ptau -v", { stdio: "inherit" });
  execSync("npx snarkjs powersoftau contribute build/ptau/pot12_0000.ptau build/ptau/pot12_0001.ptau --name=\"init\" -v", { stdio: "inherit" });
  execSync("npx snarkjs powersoftau prepare phase2 build/ptau/pot12_0001.ptau build/ptau/pot12_final.ptau -v", { stdio: "inherit" });
} else {
  console.log("PTAU already present.");
}
