import cryptoService from './src/services/crypto.service.js';

console.log('--- TESTING MILITARY-GRADE AES-256-GCM CRYPTOGRAPHY ---');

// 1. Basic Encryption & Decryption
const sampleSMS = {
  sender: 'VM-HDFCBK',
  body: 'Your OTP for transaction of Rs 12,499.00 is 849201. Valid for 10 minutes. Do not share.',
  date: Date.now(),
  simSlot: 'SIM 1'
};

const aad = 'user_12345:device_android_999';

console.log('Original SMS Payload:', sampleSMS);

const encrypted = cryptoService.encrypt(sampleSMS, aad);
console.log('\n[ENCRYPTED ARMOR OUTPUT]');
console.log('Ciphertext:', encrypted.ciphertext);
console.log('IV (96-bit):', encrypted.iv);
console.log('Auth Tag (128-bit):', encrypted.authTag);
console.log('Version:', encrypted.v);

// 2. Decryption with matching AAD
const decrypted = cryptoService.decrypt({
  ciphertext: encrypted.ciphertext,
  iv: encrypted.iv,
  authTag: encrypted.authTag,
  aad
});

console.log('\n[DECRYPTED OUTPUT]');
console.log('Decrypted match:', JSON.stringify(decrypted) === JSON.stringify(sampleSMS) ? 'PASS ✅' : 'FAIL ❌');
console.log('Decrypted OTP:', decrypted.body.match(/\b\d{6}\b/)?.[0]);

// 3. Tamper Test (Modify 1 character in ciphertext)
console.log('\n[TAMPER RESISTANCE TEST]');
let tamperedCiphertext = encrypted.ciphertext;
const charToSwap = tamperedCiphertext[10] === 'A' ? 'B' : 'A';
tamperedCiphertext = tamperedCiphertext.substring(0, 10) + charToSwap + tamperedCiphertext.substring(11);

try {
  cryptoService.decrypt({
    ciphertext: tamperedCiphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    aad
  });
  console.log('Tamper test: FAILED ❌ (Tampered data should not decrypt!)');
} catch (err) {
  console.log('Tamper test: PASSED ✅ (Caught tampering:', err.message, ')');
}

// 4. AAD Context Binding Test (Try to use cipher on a different device)
console.log('\n[CONTEXT BINDING TEST]');
try {
  cryptoService.decrypt({
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    aad: 'attacker_user:fake_device' // Wrong AAD
  });
  console.log('AAD test: FAILED ❌ (Wrong context should not decrypt!)');
} catch (err) {
  console.log('AAD test: PASSED ✅ (Caught context mismatch:', err.message, ')');
}

console.log('\n--- ALL CRYPTO SECURITY TESTS COMPLETED ---');
