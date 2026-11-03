import {
  PaymentSimulatorService,
  DEMO_TEST_TOKENS,
  maskPayerIdentifier,
  normalizeBolivianMobile,
} from './payment-simulator.service';

describe('PaymentSimulatorService', () => {
  let simulator: PaymentSimulatorService;

  beforeEach(() => {
    simulator = new PaymentSimulatorService();
  });

  it('approves payments with the always-approved demo token', async () => {
    const result = await simulator.simulatePayment(
      10,
      'CARD_BO',
      'key-12345678',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
    );

    expect(result.approved).toBe(true);
    expect(result.responseCode).toBe('APPROVED');
    expect(result.providerReference).toMatch(/^VN-BO-/);
  });

  it('rejects payments with the insufficient-funds demo token', async () => {
    const result = await simulator.simulatePayment(
      10,
      'CARD_BO',
      'key-12345678',
      DEMO_TEST_TOKENS.INSUFFICIENT_FUNDS,
    );

    expect(result.approved).toBe(false);
    expect(result.responseCode).toBe('INSUFFICIENT_FUNDS');
  });

  it('rejects unknown test tokens', async () => {
    const result = await simulator.simulatePayment(
      10,
      'QR_SIMPLE',
      'key-12345678',
      'tok_unknown',
    );

    expect(result.approved).toBe(false);
    expect(result.responseCode).toBe('INVALID_DATA');
  });

  it('is deterministic for the same key, method and amount', async () => {
    const first = await simulator.simulatePayment(
      25.5,
      'CARD_BO',
      'deterministic-key',
    );
    const second = await simulator.simulatePayment(
      25.5,
      'CARD_BO',
      'deterministic-key',
    );

    expect(second).toEqual(first);
  });

  it('generates provider references per Bolivian rail', async () => {
    const qr = await simulator.simulatePayment(
      20,
      'QR_SIMPLE',
      'qr-key-12345678',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
    );
    const transfer = await simulator.simulatePayment(
      20,
      'BANK_TRANSFER',
      'transfer-key-12345678',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
    );

    expect(qr.providerReference).toMatch(/^QR-ASFI-/);
    expect(transfer.providerReference).toMatch(/^TRF-BCP-/);
  });

  it('rejects mobile wallets without a valid Bolivian phone number', async () => {
    const missing = await simulator.simulatePayment(
      20,
      'TIGO_MONEY',
      'wallet-key-missing',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
    );
    const invalid = await simulator.simulatePayment(
      20,
      'ENTEL_MONEY',
      'wallet-key-invalid',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
      '12345678',
    );

    expect(missing.approved).toBe(false);
    expect(missing.responseCode).toBe('INVALID_DATA');
    expect(invalid.approved).toBe(false);
    expect(invalid.responseCode).toBe('INVALID_DATA');
  });

  it('accepts Bolivian mobile numbers with and without +591', async () => {
    const local = await simulator.simulatePayment(
      20,
      'TIGO_MONEY',
      'wallet-key-local',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
      '71234567',
    );
    const prefixed = await simulator.simulatePayment(
      20,
      'ENTEL_MONEY',
      'wallet-key-prefixed',
      DEMO_TEST_TOKENS.ALWAYS_APPROVED,
      '+59161234567',
    );

    expect(local.approved).toBe(true);
    expect(prefixed.approved).toBe(true);
  });

  it('normalizes and masks Bolivian mobile numbers', () => {
    expect(normalizeBolivianMobile('+591 712-34567')).toBe('71234567');
    expect(normalizeBolivianMobile('59161234567')).toBe('61234567');
    expect(normalizeBolivianMobile('12345678')).toBeNull();
    expect(maskPayerIdentifier('71234567')).toBe('+591 ****4567');
  });

  it('rejects refunds larger than the original amount', async () => {
    const result = await simulator.simulateRefund(10, 11, 'refund-key');

    expect(result.approved).toBe(false);
    expect(result.responseCode).toBe('REFUND_REJECTED');
  });

  it('approves a refund lower than or equal to the original amount', async () => {
    const result = await simulator.simulateRefund(10, 5, 'refund-key-approved');

    expect(result.approved).toBe(true);
    expect(result.responseCode).toBe('REFUND_APPROVED');
  });
});
