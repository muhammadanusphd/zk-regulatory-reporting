import { execSync } from "child_process";
import fs from "fs";

describe("zk proof pipeline", () => {
  it("generates and verifies a proof", () => {
    execSync("npm run setup:ptau", { stdio: "inherit" });
    execSync("npm run build:circuits", { stdio: "inherit" });
    execSync("npm run prove", { stdio: "inherit" });
    execSync("npm run verify", { stdio: "inherit" });

    expect(fs.existsSync("build/circuits/proof.json")).toBe(true);
    const publicSignals = JSON.parse(fs.readFileSync("build/circuits/public.json", "utf8"));
    expect(publicSignals.length).toBe(4); // [threshold, kycRoot, sanctionsRoot, txCommitment]
  });
});
