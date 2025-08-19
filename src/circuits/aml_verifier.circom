// AML/CFT zk-SNARK demo circuit
pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/merkle.circom";

// Poseidon hash for leaf commitments
template Poseidon2() {
    signal input in[2];
    signal output out;
    component h = Poseidon(2);
    h.inputs[0] <== in[0];
    h.inputs[1] <== in[1];
    out <== h.out;
}

// Less-than-or-equal comparator for 64-bit values
template LessEq64() {
    signal input a; // amount
    signal input b; // threshold
    signal output ok;

    // enforce a,b < 2^64
    component a_bits = Num2Bits(64);
    a_bits.in <== a;
    component b_bits = Num2Bits(64);
    b_bits.in <== b;

    // compute ok = (a <= b)
    signal lt;
    signal eq;
    lt <== 0;
    eq <== 1;
    for (var i = 63; i >= 0; i--) {
        // if eq so far and a[i] < b[i] then lt=1
        signal ai;
        signal bi;
        ai <== a_bits.out[i];
        bi <== b_bits.out[i];
        signal not_ai = 1 - ai;
        signal not_bi = 1 - bi;

        // different bit?
        signal diff = ai + bi - 2*ai*bi; // XOR
        // if diff and eq:
        signal take_lt = (not_ai * bi) * eq; // (a=0,b=1)
        lt <== lt + take_lt - lt*take_lt; // lt |= take_lt
        eq <== eq - eq*diff; // eq &= !diff
    }
    ok <== lt + eq - lt*eq; // lt || eq
}

// Simple Merkle inclusion proof with Poseidon hash for KYC tree
template MerkleInclusion(depth) {
    signal input leaf;
    signal input root;       // public
    signal input path[depth];
    signal input pathIndex[depth]; // 0 for left, 1 for right
    signal output ok;

    signal cur;
    cur <== leaf;

    for (var i = 0; i < depth; i++) {
        component h = Poseidon(2);
        signal left;
        signal right;

        left <== (1 - pathIndex[i]) * cur + pathIndex[i] * path[i];
        right <== pathIndex[i] * cur + (1 - pathIndex[i]) * path[i];

        h.inputs[0] <== left;
        h.inputs[1] <== right;
        cur <== h.out;
    }
    ok <== (cur === root);
}

// Sanctions “non-membership” demo: prover supplies a bit isSanctioned=0,
// and binds it to a signed commitment with regulator root (toy approach).
// In real systems, use dynamic accumulators or RSA accumulators.
template SanctionsBit() {
    signal input isSanctioned; // private {0 or 1}
    signal input root;         // public commitment root (unused in this toy)
    signal output ok;
    // booleanity
    isSanctioned * (isSanctioned - 1) === 0;
    ok <== 1 - isSanctioned;
}

// Main circuit
template AMLVerifier(depth) {
    // Public inputs
    signal input pub_threshold;      // AML threshold
    signal input pub_kyc_root;       // KYC Merkle root
    signal input pub_sanctions_root; // sanctions root (placeholder)
    signal input pub_tx_commitment;  // tx commitment for auditing

    // Private inputs
    signal input priv_amount;
    signal input priv_user_attr1;
    signal input priv_user_attr2;
    signal input priv_tx_nonce;

    // Merkle path for KYC
    signal input kyc_path[depth];
    signal input kyc_pathIndex[depth];

    // sanctions bit
    signal input priv_is_sanctioned;

    // Constraints:

    // 1) amount <= threshold
    component le = LessEq64();
    le.a <== priv_amount;
    le.b <== pub_threshold;

    // 2) KYC leaf commitment: Poseidon(attr1, attr2)
    component pose = Poseidon2();
    pose.in[0] <== priv_user_attr1;
    pose.in[1] <== priv_user_attr2;
    signal kyc_leaf = pose.out;

    component inc = MerkleInclusion(depth);
    inc.leaf <== kyc_leaf;
    inc.root <== pub_kyc_root;
    for (var i = 0; i < depth; i++) {
        inc.path[i] <== kyc_path[i];
        inc.pathIndex[i] <== kyc_pathIndex[i];
    }

    // 3) sanctions non-membership (toy)
    component non = SanctionsBit();
    non.isSanctioned <== priv_is_sanctioned;
    non.root <== pub_sanctions_root;

    // 4) bind a tx commitment = Poseidon(amount, nonce)
    component txh = Poseidon2();
    txh.in[0] <== priv_amount;
    txh.in[1] <== priv_tx_nonce;

    // Expose pub commitment equality
    txh.out === pub_tx_commitment;

    // Output nothing; validity is implicit by proof success.
    // But we can add a sanity signal:
    signal ok = le.ok * inc.ok * non.ok;
    ok === 1;
}

component main = AMLVerifier(16);
