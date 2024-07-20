import { Buffer } from "buffer";
import crypto from "crypto";
import dotenv from "dotenv";
import { keccak256 } from "ethereumjs-util";
import secp256k1 from "secp256k1";
dotenv.config();

class RFC6979Signer {
  generateRFC6979Nonce(privateKeyHex, message) {
    const hashFunction = "sha256";
    const privateKey = Buffer.from(privateKeyHex, "hex");
    const messageHash = crypto.createHash(hashFunction).update(message).digest();
    const hashLength = Buffer.from(messageHash).length;

    // Step 2: Generate Initial Hash Value
    const h1 = crypto
      .createHash(hashFunction)
      .update(Buffer.concat([privateKey, messageHash]))
      .digest();

    // Step 3: Initialize Variables
    let k = Buffer.alloc(hashLength, 0x00);
    let v = Buffer.alloc(hashLength, 0x01);
    const k0 = Buffer.alloc(hashLength, 0x00);
    const k1 = Buffer.alloc(hashLength, 0x01);

    // Step 4: Loop to Find Nonce
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const h2 = crypto
        .createHash(hashFunction)
        .update(Buffer.concat([v, h1, k0]))
        .digest();
      v = Buffer.from(h2.map((byte, index) => byte ^ h1[index] ^ k1[index]));

      // Convert v to a bigint to compare with the curve order
      const vBigInt = BigInt("0x" + v.toString("hex"));

      // Check if v is within the valid range for a nonce
      if (
        vBigInt >= 1 &&
        vBigInt < BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141")
      ) {
        k = v;
        break;
      }
    }

    // Step 5: Output the Nonce
    return k.toString("hex");
  }

  // Sign message with private key
  signMessage(message, privateKeyString) {
    const privateKey = Buffer.from(privateKeyString, "hex");
    const messageHash = keccak256(message);
    const nonce = this.generateRFC6979Nonce(privateKey, message);
    const { recid, signature } = secp256k1.ecdsaSign(messageHash, privateKey, { nonce });
    const recovery = recid + 27;
    const signatureBuffer = Buffer.concat([
      Buffer.from(signature.slice(0, 32)), // r
      Buffer.from(signature.slice(32, 64)), // s
      Buffer.from([recovery]), // v
    ]);
    return "0x" + signatureBuffer.toString("hex");
  }

  // Convert string account and tx hash to a buffer and sign
  signAccountTx(accountStr, txHash, privateKeyString) {
    accountStr = accountStr.substring(0, 2) === "0x" ? accountStr.substring(2) : accountStr;
    txHash = txHash.substring(0, 2) === "0x" ? txHash.substring(2) : txHash;

    const accountBuf = Buffer.from(accountStr, "hex");
    const txHashBuf = Buffer.from(txHash, "hex");
    const concatenated = Buffer.concat([accountBuf, txHashBuf]);

    return this.signMessage(concatenated, privateKeyString);
  }
}

// Example usage:
const privateKeyString = process.env.PRIVATE_KEY;
const account = process.env.ACCOUNT;
const txHash = process.env.TX_HASH;

const signer = new RFC6979Signer();
const signature = signer.signAccountTx(account, txHash, privateKeyString);
console.log("Ethereum-compatible Deterministic Signature:", signature);
