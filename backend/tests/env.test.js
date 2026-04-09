const { env, validateEnv, isExecutorConfigured } = require('../config/env');

describe('QuantX Backend Configuration Tests', () => {
  beforeEach(() => {
    // Reset env vars before each test to ensure isolation if necessary
    process.env.CONTRACT_ID = 'CDIDTRRDNMK4D6CIWFNLEML5L6FCVLMEVKCXXSAB6PJZ3J5JS74M7GFD';
    process.env.EXECUTOR_SECRET = 'SC6CMVTUQ3FW2KDBCHEA7LCQJLKROOPHXAZQCJBN5ZU6UQWG67YYR5DG';
  });

  test('1. Environment Validator returns true when all required variables are present', () => {
    env.CONTRACT_ID = process.env.CONTRACT_ID;
    env.EXECUTOR_SECRET = process.env.EXECUTOR_SECRET;
    
    const isValid = validateEnv();
    expect(isValid).toBe(true);
  });

  test('2. isExecutorConfigured returns true when both Contract ID and Secret are provided', () => {
    env.CONTRACT_ID = process.env.CONTRACT_ID;
    env.EXECUTOR_SECRET = process.env.EXECUTOR_SECRET;
    
    const configured = isExecutorConfigured();
    expect(configured).toBe(true);
  });

  test('3. Environment variables use fallback variables for constants when undefined', () => {
    // Verify default fallbacks in config
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.NETWORK).toBeDefined();
    expect(env.EXECUTOR_INTERVAL_MS).toBeGreaterThanOrEqual(1000);
  });
});
