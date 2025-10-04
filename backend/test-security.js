import { DomainWhitelist } from './src/security/DomainWhitelist.js';
import { AuditLogger } from './src/security/AuditLogger.js';
import { PathValidator } from './src/security/PathValidator.js';
import { RateLimiter } from './src/adapters/rateLimiter.js';

console.log('Testing Security Components...\n');

// Test DomainWhitelist
console.log('1. Testing DomainWhitelist:');
const whitelist = new DomainWhitelist(['example.com', 'api.test.com'], {
  allowSubdomains: true,
  allowLocalhost: true
});

console.log('  - example.com allowed:', whitelist.isAllowed('https://example.com'));
console.log('  - sub.example.com allowed:', whitelist.isAllowed('https://sub.example.com'));
console.log('  - localhost allowed:', whitelist.isAllowed('http://localhost:3000'));
console.log('  - evil.com blocked:', whitelist.isAllowed('https://evil.com'));

// Test PathValidator
console.log('\n2. Testing PathValidator:');
const pathValidator = new PathValidator({
  allowedPaths: ['./data', './logs'],
  baseDirectory: process.cwd()
});

console.log('  - ./data/registry allowed:', pathValidator.isAllowed('./data/registry'));
console.log('  - ../outside blocked:', pathValidator.isAllowed('../outside'));
console.log('  - ./data/../../../etc/passwd blocked:', pathValidator.isAllowed('./data/../../../etc/passwd'));

// Test RateLimiter
console.log('\n3. Testing RateLimiter:');
const rateLimiter = new RateLimiter(5, 1); // 5 tokens, 1 per second

console.log('  - Initial tokens:', rateLimiter.getTokenCount('test-client'));
for (let i = 0; i < 7; i++) {
  const allowed = await rateLimiter.checkLimit('test-client');
  if (allowed) {
    await rateLimiter.recordRequest('test-client');
    console.log(`  - Request ${i + 1}: ALLOWED`);
  } else {
    console.log(`  - Request ${i + 1}: BLOCKED`);
  }
}

// Test AuditLogger
console.log('\n4. Testing AuditLogger:');
const auditLogger = new AuditLogger({
  logDirectory: './logs',
  enableConsole: true
});

auditLogger.logSecurityViolation(
  'api',
  'test_violation',
  { testData: 'example' },
  'test-correlation-id'
);

auditLogger.logDataAccess(
  '/api/test',
  'GET',
  'test-user',
  { query: 'test' },
  'test-correlation-id'
);

console.log('\nSecurity components test completed successfully!');
auditLogger.close();