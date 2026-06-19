import { Platform } from 'react-native';
import { api } from './apiClient';

export type PaymentProvider = 'zoho' | 'razorpay';

export interface PaymentOrderResult {
  provider:     PaymentProvider;
  checkoutUrl:  string;
  amount:       number;
  reference:    string;
  // Zoho-specific
  sessionToken?: string;
  accountId?:    string;
  apiKey?:       string;
  paymentLink?:  string;
  // Razorpay-specific
  orderId?:      string;
  keyId?:        string;
}

// ---------------------------------------------------------------------------
// Create order — server picks provider (Zoho first, Razorpay fallback)
// ---------------------------------------------------------------------------
export async function validateCoupon(code: string, plan: string): Promise<{
  discountPct: number; label: string; discountedAmt: number;
} | null> {
  try {
    const res = await api.post<Record<string, unknown>>('/payments/validate-coupon', { code, plan });
    if (!res.success) return null;
    const d = (res.data ?? res) as Record<string, unknown>;
    return {
      discountPct:  Number(d['discountPct']  ?? 0),
      label:        String(d['label']        ?? ''),
      discountedAmt: Number(d['discountedAmt'] ?? 0),
    };
  } catch { return null; }
}

export async function createPaymentOrder(opts: {
  plan:           string;
  teacherId:      string;
  teacherPhone?:  string;
  teacherName?:   string;
  teacherEmail?:  string;
  couponCode?:    string;
}): Promise<PaymentOrderResult | null> {
  const res = await api.post<Record<string, unknown>>('/payments/create-order', {
    plan:         opts.plan,
    teacherId:    opts.teacherId,
    teacherPhone: opts.teacherPhone,
    teacherName:  opts.teacherName,
    teacherEmail: opts.teacherEmail,
    couponCode:   opts.couponCode,
  });

  if (!res.success) return null;

  // Fields may be at root level or under data (handle both)
  const d = (res.data ?? res) as Record<string, unknown>;

  const provider    = String(d['provider']    ?? 'zoho') as PaymentProvider;
  const checkoutUrl = String(d['checkoutUrl'] ?? d['checkout_url'] ?? '');
  const amount      = Number(d['amount']      ?? 0);
  const reference   = String(d['reference']   ?? '');

  if (!checkoutUrl) return null;

  // Fix localhost origin for web (server-side URL may use http://localhost)
  let finalUrl = checkoutUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const parsed = new URL(checkoutUrl);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        finalUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {}
  }

  return {
    provider,
    checkoutUrl: finalUrl,
    amount,
    reference,
    sessionToken: d['sessionToken'] as string | undefined,
    accountId:    d['accountId']    as string | undefined,
    apiKey:       d['apiKey']       as string | undefined,
    paymentLink:  d['paymentLink']  as string | undefined,
    orderId:      d['orderId']      as string | undefined,
    keyId:        d['keyId']        as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Zoho in-app checkout (web only) — loads Zoho JS SDK and opens modal
// ---------------------------------------------------------------------------
let zohoScriptPromise: Promise<void> | null = null;

function loadZohoScript(): Promise<void> {
  if (zohoScriptPromise) return zohoScriptPromise;
  zohoScriptPromise = new Promise((resolve, reject) => {
    const ZP = (window as any).ZohoPayments ?? (window as any).ZPay ?? (window as any).zpay;
    if (ZP) { resolve(); return; }
    const s   = document.createElement('script');
    s.src     = 'https://payments.zoho.in/sdk/zoho-payments.js';
    s.onload  = () => resolve();
    s.onerror = () => { zohoScriptPromise = null; reject(new Error('Zoho SDK load failed')); };
    document.body.appendChild(s);
  });
  return zohoScriptPromise;
}

export interface ZohoOpenOpts {
  sessionToken: string;
  accountId:    string;
  reference:    string;
  onSuccess:    (paymentId: string) => void;
  onDismiss:    () => void;
}

export async function openZohoInApp(opts: ZohoOpenOpts): Promise<void> {
  await loadZohoScript();

  const ZP = (window as any).ZohoPayments ?? (window as any).ZPay ?? (window as any).zpay;
  if (!ZP) throw new Error('Zoho Payments SDK not available');

  const fn = ZP.openCheckout ?? ZP.checkout ?? ZP;
  if (typeof fn !== 'function') throw new Error('Zoho SDK: no callable checkout function');

  fn({
    account_id:    opts.accountId,
    session_token: opts.sessionToken,
    onSuccess: (data: any) => {
      opts.onSuccess(String(data?.payment_id ?? data?.transaction_id ?? ''));
    },
    onFailure: opts.onDismiss,
    onCancel:  opts.onDismiss,
  });
}

// ---------------------------------------------------------------------------
// Razorpay in-app checkout (web only)
// ---------------------------------------------------------------------------
let rzpScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (rzpScriptPromise) return rzpScriptPromise;
  rzpScriptPromise = new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const s   = document.createElement('script');
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve();
    s.onerror = () => { rzpScriptPromise = null; reject(new Error('Razorpay script load failed')); };
    document.body.appendChild(s);
  });
  return rzpScriptPromise;
}

export interface RazorpayOpenOpts {
  orderId:     string;
  amount:      number;
  keyId:       string;
  description: string;
  reference:   string;
  phone?:      string;
  name?:       string;
  email?:      string;
  onSuccess:   (paymentId: string) => void;
  onDismiss:   () => void;
}

export async function openRazorpayInApp(opts: RazorpayOpenOpts): Promise<void> {
  await loadRazorpayScript();
  const rzp = new (window as any).Razorpay({
    key:         opts.keyId,
    amount:      opts.amount,
    currency:    'INR',
    order_id:    opts.orderId,
    name:        'DoAble India',
    description: opts.description,
    prefill:     { contact: opts.phone ?? '', name: opts.name ?? '', email: opts.email ?? '' },
    notes:       { reference: opts.reference },
    theme:       { color: '#3F66A6' },
    modal:       { ondismiss: opts.onDismiss },
    handler:     (response: any) => {
      opts.onSuccess(response.razorpay_payment_id ?? '');
    },
  });
  rzp.open();
}
