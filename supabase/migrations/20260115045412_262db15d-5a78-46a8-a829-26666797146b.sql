-- Deduplicate Plaid-linked bank accounts so we can enforce uniqueness
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, plaid_item_id, plaid_account_id
      ORDER BY created_at DESC
    ) AS rn,
    max(CASE WHEN coalesce(is_primary, false) THEN 1 ELSE 0 END) OVER (
      PARTITION BY user_id, plaid_item_id, plaid_account_id
    ) AS any_primary
  FROM public.user_bank_accounts
  WHERE plaid_item_id IS NOT NULL
    AND plaid_account_id IS NOT NULL
),
kept AS (
  SELECT id, any_primary
  FROM ranked
  WHERE rn = 1
)
UPDATE public.user_bank_accounts u
SET is_primary = (k.any_primary = 1)
FROM kept k
WHERE u.id = k.id;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, plaid_item_id, plaid_account_id
      ORDER BY created_at DESC
    ) AS rn
  FROM public.user_bank_accounts
  WHERE plaid_item_id IS NOT NULL
    AND plaid_account_id IS NOT NULL
)
DELETE FROM public.user_bank_accounts u
USING ranked r
WHERE u.id = r.id
  AND r.rn > 1;

-- Enforce uniqueness for Plaid accounts per user
CREATE UNIQUE INDEX IF NOT EXISTS user_bank_accounts_plaid_unique
ON public.user_bank_accounts (user_id, plaid_item_id, plaid_account_id)
WHERE plaid_item_id IS NOT NULL AND plaid_account_id IS NOT NULL;