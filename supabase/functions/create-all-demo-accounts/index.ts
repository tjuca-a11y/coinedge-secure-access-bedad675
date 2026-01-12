import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results: Record<string, any> = {};

    // ============ DEMO ADMIN ============
    const adminEmail = 'demo@admin.coinedge.com';
    const adminPassword = 'Demo123!';
    
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingAdmin) {
      results.admin = { exists: true, email: adminEmail, password: adminPassword, loginUrl: '/admin/login' };
    } else {
      const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (adminAuthError) {
        results.admin = { error: adminAuthError.message };
      } else {
        await supabase.from('admin_users').insert({
          user_id: adminAuth.user.id,
          full_name: 'Demo Admin',
          email: adminEmail,
          phone: '555-0001',
          status: 'active',
          force_password_reset: false,
          dob: '1990-01-01',
        });

        await supabase.from('user_roles').insert({
          user_id: adminAuth.user.id,
          role: 'admin',
        });

        results.admin = { created: true, email: adminEmail, password: adminPassword, loginUrl: '/admin/login' };
      }
    }

    // ============ DEMO SALES REP ============
    const repEmail = 'demo@rep.coinedge.com';
    const repPassword = 'Demo123!';
    
    const { data: existingRep } = await supabase
      .from('sales_reps')
      .select('id')
      .eq('email', repEmail)
      .maybeSingle();

    if (existingRep) {
      results.salesRep = { exists: true, email: repEmail, password: repPassword, loginUrl: '/sales-rep/login' };
    } else {
      const { data: repAuth, error: repAuthError } = await supabase.auth.admin.createUser({
        email: repEmail,
        password: repPassword,
        email_confirm: true,
      });

      if (repAuthError) {
        results.salesRep = { error: repAuthError.message };
      } else {
        await supabase.from('sales_reps').insert({
          user_id: repAuth.user.id,
          full_name: 'Demo Sales Rep',
          email: repEmail,
          phone: '555-0002',
          dob: '1992-06-15',
          status: 'active',
          force_password_reset: false,
        });

        await supabase.from('user_roles').insert({
          user_id: repAuth.user.id,
          role: 'sales_rep',
        });

        results.salesRep = { created: true, email: repEmail, password: repPassword, loginUrl: '/sales-rep/login' };
      }
    }

    // ============ DEMO MERCHANT ============
    const merchantEmail = 'demo@merchant.coinedge.com';
    const merchantPassword = 'Demo123!';
    
    const { data: existingMerchant } = await supabase
      .from('merchant_users')
      .select('id')
      .eq('email', merchantEmail)
      .maybeSingle();

    if (existingMerchant) {
      results.merchant = { exists: true, email: merchantEmail, password: merchantPassword, loginUrl: '/merchant/login' };
    } else {
      // Create merchant first
      let merchantId: string;
      const { data: existingMerchantRecord } = await supabase
        .from('merchants')
        .select('id')
        .eq('merchant_id', 'demo-merchant-001')
        .maybeSingle();

      if (existingMerchantRecord) {
        merchantId = existingMerchantRecord.id;
      } else {
        const { data: newMerchant, error: merchantError } = await supabase
          .from('merchants')
          .insert({
            merchant_id: 'demo-merchant-001',
            business_name: 'Demo Coffee Shop',
            point_of_contact: 'Demo Admin',
            email: merchantEmail,
            phone: '555-0100',
            street: '123 Demo Street',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            status: 'active',
          })
          .select()
          .single();

        if (merchantError) throw merchantError;
        merchantId = newMerchant.id;
      }

      const { data: merchantAuth, error: merchantAuthError } = await supabase.auth.admin.createUser({
        email: merchantEmail,
        password: merchantPassword,
        email_confirm: true,
      });

      if (merchantAuthError) {
        results.merchant = { error: merchantAuthError.message };
      } else {
        await supabase.from('merchant_users').insert({
          merchant_id: merchantId,
          user_id: merchantAuth.user.id,
          role: 'MERCHANT_ADMIN',
          full_name: 'Demo Merchant Admin',
          email: merchantEmail,
          phone: '555-0100',
          status: 'ACTIVE',
          must_reset_password: false,
        });

        // Add demo balance
        await supabase.from('merchant_wallet_ledger').insert({
          merchant_id: merchantId,
          type: 'TOPUP',
          amount_usd: 500,
          reference: 'demo-initial-balance',
        });

        results.merchant = { created: true, email: merchantEmail, password: merchantPassword, loginUrl: '/merchant/login' };
      }
    }

    // ============ DEMO CUSTOMER ============
    const customerEmail = 'demo@user.coinedge.com';
    const customerPassword = 'Demo123!';
    
    const { data: existingCustomer } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    if (existingCustomer) {
      results.customer = { exists: true, email: customerEmail, password: customerPassword, loginUrl: '/login' };
    } else {
      const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: customerPassword,
        email_confirm: true,
      });

      if (customerAuthError) {
        results.customer = { error: customerAuthError.message };
      } else {
        await supabase.from('profiles').insert({
          user_id: customerAuth.user.id,
          email: customerEmail,
          full_name: 'Demo Customer',
          phone: '555-0003',
          username: 'democustomer',
          date_of_birth: '1995-03-20',
          address_line1: '456 Demo Avenue',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          country: 'US',
          kyc_status: 'approved',
          kyc_submitted_at: new Date().toISOString(),
          kyc_approved_at: new Date().toISOString(),
          btc_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          usdc_address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          wallet_created_at: new Date().toISOString(),
        });

        results.customer = { created: true, email: customerEmail, password: customerPassword, loginUrl: '/login' };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo accounts processed',
        accounts: results,
        summary: {
          admin: { email: adminEmail, password: adminPassword, portal: '/admin/login' },
          salesRep: { email: repEmail, password: repPassword, portal: '/sales-rep/login' },
          merchant: { email: merchantEmail, password: merchantPassword, portal: '/merchant/login' },
          customer: { email: customerEmail, password: customerPassword, portal: '/login' },
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
