import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Subscription } from '@/types';

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      if (data) {
        setSubscription(data);
      } else {
        // Default to free if no subscription record exists
        setSubscription({
          id: '',
          user_id: user.id,
          plan: 'free',
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          created_at: new Date().toISOString()
        });
      }
      setLoading(false);
    }

    fetchSubscription();
  }, []);

  const isPro = subscription?.plan === 'pro';

  return { subscription, isPro, loading };
}
