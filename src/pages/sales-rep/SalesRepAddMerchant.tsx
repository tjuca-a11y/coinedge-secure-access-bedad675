import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Send } from 'lucide-react';
import { z } from 'zod';

const merchantSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  point_of_contact: z.string().trim().min(1, 'Contact name is required').max(100),
  phone: z.string().trim().min(1, 'Phone is required').max(20),
  email: z.string().trim().email('Invalid email').max(255),
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  zip: z.string().trim().max(20).optional(),
  category: z.string().optional(),
});

const categories = [
  'Coffee Shop',
  'Restaurant',
  'Grocery Store',
  'Convenience Store',
  'Pizza Shop',
  'Bar/Nightclub',
  'Retail Store',
  'Gas Station',
  'Food Truck',
  'Other',
];

const SalesRepAddMerchant: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { salesRep } = useSalesRepAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);

  const [formData, setFormData] = useState({
    business_name: '',
    point_of_contact: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = merchantSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (!salesRep) {
      toast({
        title: 'Error',
        description: 'Not authenticated as sales rep',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const merchantId = `merch-${Date.now().toString(36)}`;

      // Create merchant record
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          merchant_id: merchantId,
          business_name: formData.business_name,
          point_of_contact: formData.point_of_contact,
          phone: formData.phone,
          email: formData.email,
          street: formData.street || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          category: formData.category || null,
          rep_id: salesRep.id,
          status: 'lead',
        })
        .select()
        .single();

      if (merchantError) throw merchantError;

      // Add timeline event
      await supabase.from('merchant_timeline').insert({
        merchant_id: merchant.id,
        event_type: 'merchant_created',
        description: `Merchant lead created by ${salesRep.full_name}`,
        metadata: { category: formData.category || null },
        created_by: salesRep.user_id,
      });

      // Create invite if requested
      if (sendInvite) {
        const inviteToken = crypto.randomUUID();
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabase.from('merchant_invites').insert({
          invite_id: `inv-${Date.now().toString(36)}`,
          merchant_id: merchant.id,
          rep_id: salesRep.id,
          invite_token: inviteToken,
          invite_code: inviteCode,
          status: 'sent',
          sent_to_email: formData.email,
          expires_at: expiresAt.toISOString(),
        });

        // Update merchant status
        await supabase.from('merchants').update({ status: 'invited' }).eq('id', merchant.id);

        // Add timeline event
        await supabase.from('merchant_timeline').insert({
          merchant_id: merchant.id,
          event_type: 'invite_sent',
          description: `Onboarding invite sent to ${formData.email}`,
          created_by: salesRep.user_id,
        });
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        event_id: `evt-${Date.now()}`,
        actor_type: 'sales_rep',
        actor_id: salesRep.user_id,
        action: 'create_merchant',
        metadata: {
          merchant_id: merchantId,
          business_name: formData.business_name,
          invite_sent: sendInvite,
        },
      });

      toast({
        title: 'Merchant Created',
        description: sendInvite
          ? `${formData.business_name} created and invite sent!`
          : `${formData.business_name} created successfully!`,
      });

      queryClient.invalidateQueries({ queryKey: ['sales-rep-merchants'] });
      navigate(`/rep/merchants/${merchant.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SalesRepLayout title="Add Merchant" subtitle="Onboard a new merchant lead">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Merchant Lead
          </CardTitle>
          <CardDescription>
            Enter the merchant's business information to create a lead and optionally send an
            onboarding invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Required Information</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Acme Coffee Shop"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="point_of_contact">Point of Contact (Full Name) *</Label>
                <Input
                  id="point_of_contact"
                  value={formData.point_of_contact}
                  onChange={(e) => setFormData({ ...formData, point_of_contact: e.target.value })}
                  placeholder="John Smith"
                  required
                  maxLength={100}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Direct Contact Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    required
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@acmecoffee.com"
                    required
                    maxLength={255}
                  />
                </div>
              </div>
            </div>

            {/* Optional Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Business Address (Recommended)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="123 Main Street"
                  maxLength={200}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="10001"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            {/* Send Invite Option */}
            <div className="rounded-lg border p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Onboarding Invite
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically send an onboarding invite email to {formData.email || 'the merchant'}.
                    The invite will include a secure link and backup code, valid for 7 days.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/rep/merchants')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating...' : sendInvite ? 'Create & Send Invite' : 'Create Merchant'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </SalesRepLayout>
  );
};

export default SalesRepAddMerchant;
