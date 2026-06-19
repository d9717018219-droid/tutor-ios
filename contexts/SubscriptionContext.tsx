import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { createRazorpayOrder, openPaymentBrowser } from '@/services/paymentService';

interface SubscriptionState {
  isPremium: boolean;
  expiresAt: string | null;
  planId: string | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionState;
  isLoading: boolean;
  purchasePlan: (planId: string, months: number, price: number, teacherId?: string, teacherPhone?: string, teacherName?: string) => Promise<boolean>;
  activatePlan: (planId: string, months: number) => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkPremium: () => boolean;
  lastOrderId: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);
const DEFAULT_SUB: SubscriptionState = { isPremium: false, expiresAt: null, planId: null };

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_SUB);
  const [isLoading, setIsLoading] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  useEffect(() => { loadSubscription(); }, []);

  async function loadSubscription() {
    const saved = await getItem<SubscriptionState>(STORAGE_KEYS.SUBSCRIPTION);
    if (saved) {
      const isActive = saved.expiresAt ? new Date(saved.expiresAt) > new Date() : false;
      setSubscription({ ...saved, isPremium: isActive });
    }
  }

  async function purchasePlan(
    planId: string,
    months: number,
    _price: number,
    teacherId?: string,
    teacherPhone?: string,
    teacherName?: string,
  ): Promise<boolean> {
    setIsLoading(true);
    try {
      const tid = teacherId || teacherPhone || 'unknown';

      const order = await createRazorpayOrder({
        plan: planId,
        teacherId: tid,
        teacherPhone,
        teacherName,
      });

      if (!order) return false;

      setLastOrderId(order.orderId);

      const browserResult = await openPaymentBrowser(order.checkoutUrl);
      if (browserResult === 'error') return false;
      if (browserResult === 'cancel') return false;

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      const newSub: SubscriptionState = { isPremium: true, expiresAt: expiresAt.toISOString(), planId };
      setSubscription(newSub);
      await setItem(STORAGE_KEYS.SUBSCRIPTION, newSub);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function activatePlan(planId: string, months: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const newSub: SubscriptionState = { isPremium: true, expiresAt: expiresAt.toISOString(), planId };
    setSubscription(newSub);
    await setItem(STORAGE_KEYS.SUBSCRIPTION, newSub);
  }

  async function restorePurchases() {
    await loadSubscription();
  }

  function checkPremium(): boolean {
    if (!subscription.isPremium || !subscription.expiresAt) return false;
    return new Date(subscription.expiresAt) > new Date();
  }

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, purchasePlan, activatePlan, restorePurchases, checkPremium, lastOrderId }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
