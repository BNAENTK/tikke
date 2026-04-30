// GitHub sealed box encryption using libsodium-compatible approach
import { Buffer } from 'buffer';
import crypto from 'crypto';

// Implements crypto_box_seal using Node.js built-ins
// GitHub uses libsodium's crypto_box_seal:
//   sealed = ephemeral_pk || crypto_box(msg, nonce=blake2b(eph_pk||pk), eph_pk, pk)
// We use Node's built-in X25519 + XSalsa20-Poly1305 approximation

// Simpler: use the GitHub CLI's approach — just use the raw public key with crypto.diffieHellman
// Actually the simplest working approach: use node-forge or just call gh CLI

// Use the GitHub API's simple encryption: just base64 the value and use a pre-computed approach
// GitHub actually accepts secrets encrypted with libsodium sealed boxes only
// Let's install libsodium-wrappers properly

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let sodium;
try {
  sodium = require('libsodium-wrappers');
} catch {
  console.error('libsodium-wrappers not found');
  process.exit(1);
}

await sodium.ready;

const [,, pubKeyB64, ...secretParts] = process.argv;
const secretValue = secretParts.join(' ');

const binKey = sodium.from_base64(pubKeyB64, sodium.base64_variants.ORIGINAL);
const binSecret = Buffer.from(secretValue, 'utf8');
const encryptedBytes = sodium.crypto_box_seal(binSecret, binKey);
console.log(Buffer.from(encryptedBytes).toString('base64'));
