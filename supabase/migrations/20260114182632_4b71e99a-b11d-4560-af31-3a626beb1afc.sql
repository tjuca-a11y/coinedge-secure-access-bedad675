-- Phase 1: Configure Treasury Wallet Addresses in System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('coinedge_btc_address', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'CoinEdge BTC receiving address for customer deposits'),
  ('coinedge_usdc_address', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'CoinEdge USDC receiving address on Base')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Phase 2: Create Treasury Wallet Record (if not exists)
INSERT INTO treasury_wallet (fireblocks_vault_id, btc_address, usdc_address, label, is_active)
SELECT 'demo-vault-001', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'Primary Hot Wallet', true
WHERE NOT EXISTS (SELECT 1 FROM treasury_wallet WHERE is_active = true);

-- Phase 3: Add BTC Inventory Lot for testing BUY_BTC flow
INSERT INTO inventory_lots (
  treasury_wallet_id,
  amount_btc_total,
  amount_btc_available,
  source,
  eligible_at,
  received_at,
  notes
)
SELECT 
  id,
  1.0,
  1.0,
  'manual_topup',
  NOW(),
  NOW(),
  'Demo test inventory for transaction testing'
FROM treasury_wallet 
WHERE is_active = true
LIMIT 1;

-- Phase 4: Add USDC Inventory Lot for testing
INSERT INTO usdc_inventory_lots (
  treasury_wallet_id,
  amount_usdc_total,
  amount_usdc_available,
  source,
  received_at,
  notes
)
SELECT 
  id,
  50000.00,
  50000.00,
  'manual_topup',
  NOW(),
  'Demo USDC inventory for transaction testing'
FROM treasury_wallet 
WHERE is_active = true
LIMIT 1;

-- Phase 5: Update Demo User Profile with valid wallet addresses
UPDATE profiles 
SET 
  btc_address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  usdc_address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  kyc_status = 'approved',
  kyc_approved_at = NOW()
WHERE email = 'demo@user.coinedge.com';

-- Phase 6: Add Test Bank Account for Demo User (for Cashout flow)
INSERT INTO user_bank_accounts (
  user_id,
  plaid_account_id,
  plaid_item_id,
  bank_name,
  account_mask,
  account_type,
  is_primary,
  is_verified
)
SELECT 
  user_id,
  'test_plaid_account_demo_123',
  'test_plaid_item_demo_123',
  'Demo Bank',
  '4321',
  'checking',
  true,
  true
FROM profiles 
WHERE email = 'demo@user.coinedge.com'
ON CONFLICT DO NOTHING;