# Security Notes

- This repo is **research-grade**, not production. Do not use for real AML/CFT filings.
- Proof system: Groth16 via snarkjs; trusted setup required. If mismanaged, soundness can be compromised.
- Handle zkey/ptau files carefully. For demos we auto-generate them; for real use, run a multi-party ceremony.
- No PII is stored here. Sample data is synthetic. Replace with hashes/commitments only.
