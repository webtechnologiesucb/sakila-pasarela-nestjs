-- Adaptación a pasarelas/rieles de pago de Bolivia
-- Moneda: BOB (boliviano), métodos: QR Simple, Tigo Money, Entel Money,
-- transferencia bancaria y tarjetas locales (VisaNet Bolivia).

-- Columnas de proveedor y datos del pagador.
ALTER TABLE "payment_method" ADD COLUMN "provider" VARCHAR(100);
ALTER TABLE "payment_transactions" ADD COLUMN "provider_reference" VARCHAR(100);
ALTER TABLE "payment_transactions" ADD COLUMN "payer_identifier" VARCHAR(100);

-- La moneda por defecto pasa de USD a BOB.
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'BOB';
ALTER TABLE "payment_transactions" ALTER COLUMN "currency" SET DEFAULT 'BOB';

-- Conversión de importes históricos (tipo de cambio demo: 1 USD = 6.96 BOB).
UPDATE "order_items"
SET "unit_price" = ROUND("unit_price" * 6.96, 4),
    "subtotal" = ROUND("subtotal" * 6.96, 4)
WHERE "order_id" IN (SELECT "id" FROM "orders" WHERE "currency" = 'USD');

UPDATE "orders"
SET "subtotal" = ROUND("subtotal" * 6.96, 4),
    "tax" = ROUND("tax" * 6.96, 4),
    "total" = ROUND("total" * 6.96, 4)
WHERE "currency" = 'USD';

UPDATE "refunds"
SET "amount" = ROUND("amount" * 6.96, 4)
WHERE "transaction_id" IN (
  SELECT "id" FROM "payment_transactions" WHERE "currency" = 'USD'
);

UPDATE "payment_transactions"
SET "amount" = ROUND("amount" * 6.96, 4)
WHERE "currency" = 'USD';

UPDATE "orders" SET "currency" = 'BOB' WHERE "currency" = 'USD';
UPDATE "payment_transactions" SET "currency" = 'BOB' WHERE "currency" = 'USD';

UPDATE "film"
SET "rental_rate" = ROUND("rental_rate" * 6.96, 2),
    "replacement_cost" = ROUND("replacement_cost" * 6.96, 2);

UPDATE "payment" SET "amount" = ROUND("amount" * 6.96, 2);

-- Los métodos simulados genéricos se reemplazan por los rieles bolivianos.
UPDATE "payment_method"
SET "is_active" = false
WHERE "code" IN ('SIMULATED_CARD', 'SIMULATED_TRANSFER', 'SIMULATED_WALLET');
