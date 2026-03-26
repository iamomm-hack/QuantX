import { toContractAmount, fromContractAmount, isValidAddress } from './utils';

describe('QuantX SDK Utils', () => {
  describe('toContractAmount', () => {
    it('should convert whole numbers correctly', () => {
      expect(toContractAmount('10')).toBe(BigInt(100000000));
      expect(toContractAmount('1')).toBe(BigInt(10000000));
      expect(toContractAmount('100')).toBe(BigInt(1000000000));
    });

    it('should convert decimal amounts correctly', () => {
      expect(toContractAmount('10.5')).toBe(BigInt(105000000));
      expect(toContractAmount('0.1')).toBe(BigInt(1000000));
      expect(toContractAmount('1.2345678')).toBe(BigInt(12345678));
    });

    it('should handle zero', () => {
      expect(toContractAmount('0')).toBe(BigInt(0));
    });
  });

  describe('fromContractAmount', () => {
    it('should convert contract amounts to human readable', () => {
      expect(fromContractAmount(BigInt(100000000))).toBe('10');
      expect(fromContractAmount(BigInt(10000000))).toBe('1');
      expect(fromContractAmount(BigInt(1000000000))).toBe('100');
    });

    it('should handle decimal results', () => {
      expect(fromContractAmount(BigInt(105000000))).toBe('10.5');
      expect(fromContractAmount(BigInt(1000000))).toBe('0.1');
    });

    it('should handle number input', () => {
      expect(fromContractAmount(100000000)).toBe('10');
    });

    it('should handle string input', () => {
      expect(fromContractAmount('100000000')).toBe('10');
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid Stellar public keys', () => {
      // Valid G address (public key)
      expect(isValidAddress('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF')).toBe(true);
    });

    it('should return true for valid contract IDs', () => {
      // Valid C address (contract)
      expect(isValidAddress('CDIDTRRDNMK4D6CIWFNLEML5L6FCVLMEVKCXXSAB6PJZ3J5JS74M7GFD')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('invalid')).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('G123')).toBe(false);
      expect(isValidAddress('GABC')).toBe(false);
    });
  });
});
