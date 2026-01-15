-- Add unique index on user + account fingerprint to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS user_bank_accounts_user_account_unique
ON public.user_bank_accounts (user_id, account_mask, account_type);