-- Align Doha Events monetary defaults with Qatar's currency.

ALTER TABLE IF EXISTS events
  ALTER COLUMN currency SET DEFAULT 'QAR';

ALTER TABLE IF EXISTS services
  ALTER COLUMN currency SET DEFAULT 'QAR';

ALTER TABLE IF EXISTS payment_records
  ALTER COLUMN currency SET DEFAULT 'QAR';

UPDATE events
SET currency = 'QAR'
WHERE currency IS NULL OR currency = 'MAD';

UPDATE services
SET currency = 'QAR'
WHERE currency IS NULL OR currency = 'MAD';

UPDATE payment_records
SET currency = 'QAR'
WHERE currency IS NULL OR currency = 'MAD';
