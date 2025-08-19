// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata input
    ) external view returns (bool r);
}

/**
 * @title RegCompliance
 * @notice Stores zk compliance attestations and allows regulators to check them.
 */
contract RegCompliance {
    IVerifier public verifier;

    // Simple attestation record
    struct Attestation {
        address subject;
        uint256 threshold;
        uint256 kycRoot;
        uint256 sanctionsRoot;
        uint256 txCommitment;
        uint64  timestamp;
    }

    event Attested(
        address indexed subject,
        uint256 txCommitment,
        uint256 threshold,
        uint256 kycRoot,
        uint256 sanctionsRoot,
        uint64 timestamp
    );

    mapping(bytes32 => Attestation) public attestations;

    constructor(address verifierAddress) {
        verifier = IVerifier(verifierAddress);
    }

    function submitAttestation(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata pubSignals // [threshold, kycRoot, sanctionsRoot, txCommitment]
    ) external {
        require(pubSignals.length == 4, "Invalid pubSignals");

        bool ok = verifier.verifyProof(a, b, c, pubSignals);
        require(ok, "Invalid proof");

        Attestation memory att = Attestation({
            subject: msg.sender,
            threshold: pubSignals[0],
            kycRoot: pubSignals[1],
            sanctionsRoot: pubSignals[2],
            txCommitment: pubSignals[3],
            timestamp: uint64(block.timestamp)
        });

        bytes32 key = keccak256(abi.encode(att.subject, att.txCommitment));
        attestations[key] = att;

        emit Attested(att.subject, att.txCommitment, att.threshold, att.kycRoot, att.sanctionsRoot, att.timestamp);
    }

    function getAttestation(address subject, uint256 txCommitment) external view returns (Attestation memory) {
        bytes32 key = keccak256(abi.encode(subject, txCommitment));
        return attestations[key];
    }
}
