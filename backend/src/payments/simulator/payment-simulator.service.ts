import { Injectable, Logger } from '@nestjs/common';

export enum SimulatorResponseCode {
  APPROVED = 'APPROVED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_DATA = 'INVALID_DATA',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
}

export interface SimulatorResult {
  approved: boolean;
  responseCode: SimulatorResponseCode;
  message: string;
  providerReference?: string;
}

// Códigos de los rieles de pago bolivianos soportados por la demo.
export const BOLIVIAN_METHOD_CODES = {
  QR_SIMPLE: 'QR_SIMPLE',
  TIGO_MONEY: 'TIGO_MONEY',
  ENTEL_MONEY: 'ENTEL_MONEY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD_BO: 'CARD_BO',
} as const;

export type BolivianMethodCode =
  (typeof BOLIVIAN_METHOD_CODES)[keyof typeof BOLIVIAN_METHOD_CODES];

// Billeteras móviles que requieren un celular boliviano válido como pagador.
export const BOLIVIAN_WALLET_CODES: string[] = [
  BOLIVIAN_METHOD_CODES.TIGO_MONEY,
  BOLIVIAN_METHOD_CODES.ENTEL_MONEY,
];

const PROVIDER_LABELS: Record<string, string> = {
  [BOLIVIAN_METHOD_CODES.QR_SIMPLE]: 'QR Simple (ASFI)',
  [BOLIVIAN_METHOD_CODES.TIGO_MONEY]: 'Tigo Money',
  [BOLIVIAN_METHOD_CODES.ENTEL_MONEY]: 'Entel Money',
  [BOLIVIAN_METHOD_CODES.BANK_TRANSFER]: 'transferencia BCP/BNB',
  [BOLIVIAN_METHOD_CODES.CARD_BO]: 'tarjeta VisaNet Bolivia',
};

const PROVIDER_REFERENCE_PREFIX: Record<string, string> = {
  [BOLIVIAN_METHOD_CODES.QR_SIMPLE]: 'QR-ASFI',
  [BOLIVIAN_METHOD_CODES.TIGO_MONEY]: 'TIGO',
  [BOLIVIAN_METHOD_CODES.ENTEL_MONEY]: 'ENTEL',
  [BOLIVIAN_METHOD_CODES.BANK_TRANSFER]: 'TRF-BCP',
  [BOLIVIAN_METHOD_CODES.CARD_BO]: 'VN-BO',
};

// Demo test tokens - these are entirely fictional
export const DEMO_TEST_TOKENS = {
  ALWAYS_APPROVED: 'tok_demo_approved_4242',
  INSUFFICIENT_FUNDS: 'tok_demo_insufficient_9999',
  INVALID_DATA: 'tok_demo_invalid_0000',
  PROVIDER_ERROR: 'tok_demo_error_5678',
};

/**
 * Valida un celular boliviano para billeteras móviles.
 * Acepta 8 dígitos que empiecen con 6 o 7, con prefijo +591 opcional.
 */
export function normalizeBolivianMobile(value?: string | null): string | null {
  if (!value) return null;

  const cleaned = value.replace(/[\s()-]/g, '');
  let local = cleaned;

  if (local.startsWith('+591')) {
    local = local.slice(4);
  } else if (local.startsWith('591') && local.length === 11) {
    local = local.slice(3);
  }

  return /^[67]\d{7}$/.test(local) ? local : null;
}

/** Enmascara el identificador del pagador antes de persistirlo. */
export function maskPayerIdentifier(value?: string | null): string | null {
  if (!value) return null;

  const mobile = normalizeBolivianMobile(value);
  if (mobile) {
    return `+591 ****${mobile.slice(-4)}`;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return trimmed;

  return `${'*'.repeat(Math.min(trimmed.length - 4, 12))}${trimmed.slice(-4)}`;
}

@Injectable()
export class PaymentSimulatorService {
  private readonly logger = new Logger(PaymentSimulatorService.name);

  /**
   * Simula el procesamiento de un pago boliviano con reglas deterministas.
   * Usa idempotency_key + método + importe para decidir el resultado.
   *
   * Reglas (deterministas):
   * - Token ALWAYS_APPROVED → siempre aprobado
   * - Token INSUFFICIENT_FUNDS → siempre rechazado por fondos
   * - Token INVALID_DATA → siempre rechazado por datos
   * - Token PROVIDER_ERROR → siempre error del proveedor
   * - Tigo/Entel Money exigen celular boliviano válido (8 dígitos, inicia 6 o 7)
   * - QR Simple, billeteras, transferencia y tarjeta tienen distintos umbrales
   *   de aprobación para representar el comportamiento de cada riel.
   */
  async simulatePayment(
    amount: number,
    paymentMethodCode: string,
    idempotencyKey: string,
    testToken?: string,
    payerIdentifier?: string,
  ): Promise<SimulatorResult> {
    // Artificial delay to simulate network
    await this.delay(100 + Math.random() * 200);

    const method = (paymentMethodCode || '').toUpperCase();
    const provider = PROVIDER_LABELS[method] || 'proveedor de pagos';

    this.logger.log(
      `[SIMULATOR] Processing payment: amount=${amount} method=${method} provider=${provider} key=${idempotencyKey.substring(0, 20)}...`,
    );

    if (amount <= 0) {
      return {
        approved: false,
        responseCode: SimulatorResponseCode.INVALID_DATA,
        message: 'Importe inválido',
      };
    }

    // Las billeteras móviles requieren un número boliviano válido.
    if (BOLIVIAN_WALLET_CODES.includes(method) && !normalizeBolivianMobile(payerIdentifier)) {
      return {
        approved: false,
        responseCode: SimulatorResponseCode.INVALID_DATA,
        message: `Número de celular inválido para ${provider}. Use 8 dígitos que inicien con 6 o 7 (ej. 71234567).`,
      };
    }

    const hash = this.simpleHash(`${method}:${idempotencyKey}:${amount.toString()}`);
    const providerReference = this.buildProviderReference(method, hash);

    // Test token overrides
    if (testToken) {
      return { ...this.processTestToken(testToken), providerReference };
    }

    const score = hash % 100;

    switch (method) {
      case BOLIVIAN_METHOD_CODES.QR_SIMPLE:
        // QR Simple: alta tasa de aprobación para importes cotidianos.
        if (amount > 15000) {
          return {
            approved: false,
            responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS,
            message: 'El importe supera el límite transaccional de QR Simple (Bs 15.000)',
            providerReference,
          };
        }
        if (score < 92) {
          return {
            approved: true,
            responseCode: SimulatorResponseCode.APPROVED,
            message: `Pago aprobado vía ${provider}`,
            providerReference,
          };
        }
        return score < 97
          ? {
              approved: false,
              responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS,
              message: 'Fondos insuficientes simulados en la cuenta de origen',
              providerReference,
            }
          : {
              approved: false,
              responseCode: SimulatorResponseCode.PROVIDER_ERROR,
              message: `Error temporal del proveedor ${provider}`,
              providerReference,
            };

      case BOLIVIAN_METHOD_CODES.TIGO_MONEY:
      case BOLIVIAN_METHOD_CODES.ENTEL_MONEY:
        // Billeteras móviles: validan saldo y disponibilidad del operador.
        if (score < 88) {
          return {
            approved: true,
            responseCode: SimulatorResponseCode.APPROVED,
            message: `Pago aprobado con ${provider}`,
            providerReference,
          };
        }
        if (score < 94) {
          return {
            approved: false,
            responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS,
            message: `Saldo insuficiente en la billetera ${provider}`,
            providerReference,
          };
        }
        return score < 97
          ? {
              approved: false,
              responseCode: SimulatorResponseCode.INVALID_DATA,
              message: `Datos de pago inválidos en ${provider}`,
              providerReference,
            }
          : {
              approved: false,
              responseCode: SimulatorResponseCode.PROVIDER_ERROR,
              message: `Error temporal de ${provider}. Intente nuevamente.`,
              providerReference,
            };

      case BOLIVIAN_METHOD_CODES.BANK_TRANSFER:
        // Transferencias BCP/BNB: normalmente confirmadas al instante en la demo.
        if (score < 95) {
          return {
            approved: true,
            responseCode: SimulatorResponseCode.APPROVED,
            message: `Transferencia aprobada (${provider})`,
            providerReference,
          };
        }
        return {
          approved: false,
          responseCode: SimulatorResponseCode.PROVIDER_ERROR,
          message: 'No se pudo confirmar la transferencia bancaria. Intente nuevamente.',
          providerReference,
        };

      case BOLIVIAN_METHOD_CODES.CARD_BO:
        // Tarjetas Visa/Mastercard vía VisaNet Bolivia.
        if (amount > 15000) {
          return {
            approved: false,
            responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS,
            message: 'Límite de la tarjeta superado (Bs 15.000 por transacción)',
            providerReference,
          };
        }
        if (score < 85) {
          return {
            approved: true,
            responseCode: SimulatorResponseCode.APPROVED,
            message: `Pago aprobado con ${provider}`,
            providerReference,
          };
        }
        return score < 93
          ? {
              approved: false,
              responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS,
              message: 'Fondos insuficientes o límite de tarjeta excedido',
              providerReference,
            }
          : score < 97
            ? {
                approved: false,
                responseCode: SimulatorResponseCode.INVALID_DATA,
                message: 'Datos de tarjeta inválidos',
                providerReference,
              }
            : {
                approved: false,
                responseCode: SimulatorResponseCode.PROVIDER_ERROR,
                message: `Error temporal de ${provider}`,
                providerReference,
              };

      default:
        // Método desconocido: comportamiento genérico conservador.
        if (score < 80) {
          return {
            approved: true,
            responseCode: SimulatorResponseCode.APPROVED,
            message: 'Transacción aprobada',
            providerReference,
          };
        }
        return {
          approved: false,
          responseCode: SimulatorResponseCode.PROVIDER_ERROR,
          message: 'Método de pago no soportado por el proveedor simulado',
          providerReference,
        };
    }
  }

  /**
   * Simulates refund processing. Deterministic: refunds always succeed in demo.
   */
  async simulateRefund(
    originalAmount: number,
    refundAmount: number,
    idempotencyKey: string,
  ): Promise<SimulatorResult> {
    await this.delay(50 + Math.random() * 100);

    this.logger.log(
      `[SIMULATOR] Processing refund: original=${originalAmount} refund=${refundAmount}`,
    );

    if (refundAmount > originalAmount) {
      return {
        approved: false,
        responseCode: SimulatorResponseCode.REFUND_REJECTED,
        message: 'El importe del reembolso supera el importe original',
      };
    }

    // Deterministic based on hash - 95% approval for refunds
    const hash = this.simpleHash(idempotencyKey + refundAmount.toString());
    const providerReference = `REF-BO-${hash.toString(36).toUpperCase().padStart(8, '0').slice(-8)}`;

    if (hash % 100 < 95) {
      return {
        approved: true,
        responseCode: SimulatorResponseCode.REFUND_APPROVED,
        message: 'Reembolso aprobado por el proveedor boliviano',
        providerReference,
      };
    }

    return {
      approved: false,
      responseCode: SimulatorResponseCode.REFUND_REJECTED,
      message: 'Reembolso rechazado por el proveedor simulado',
      providerReference,
    };
  }

  private processTestToken(token: string): SimulatorResult {
    switch (token) {
      case DEMO_TEST_TOKENS.ALWAYS_APPROVED:
        return { approved: true, responseCode: SimulatorResponseCode.APPROVED, message: 'Transacción aprobada (token de prueba)' };
      case DEMO_TEST_TOKENS.INSUFFICIENT_FUNDS:
        return { approved: false, responseCode: SimulatorResponseCode.INSUFFICIENT_FUNDS, message: 'Fondos insuficientes (token de prueba)' };
      case DEMO_TEST_TOKENS.INVALID_DATA:
        return { approved: false, responseCode: SimulatorResponseCode.INVALID_DATA, message: 'Datos inválidos (token de prueba)' };
      case DEMO_TEST_TOKENS.PROVIDER_ERROR:
        return { approved: false, responseCode: SimulatorResponseCode.PROVIDER_ERROR, message: 'Error de proveedor (token de prueba)' };
      default:
        return { approved: false, responseCode: SimulatorResponseCode.INVALID_DATA, message: 'Token de prueba desconocido' };
    }
  }

  private buildProviderReference(method: string, hash: number): string {
    const prefix = PROVIDER_REFERENCE_PREFIX[method] || 'BO';
    const suffix = hash.toString(36).toUpperCase().padStart(8, '0').slice(-8);
    return `${prefix}-${suffix}`;
  }

  /**
   * Simple deterministic hash function for simulation decisions.
   * NOT a cryptographic hash - only used for demo purposes.
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
