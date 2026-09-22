import crypto from 'crypto';

export interface PhonePeInitiateResponse {
  success: boolean;
  redirectUrl?: string;
  message?: string;
  error?: string;
}

// PhonePe V1 Pay API (uses Merchant ID + Salt Key)
// Docs: https://developer.phonepe.com/v1/reference/pay-api

const PHONEPE_API_BASE = {
  production: 'https://api.phonepe.com/apis/hermes',
  sandbox: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
};

function getApiBase(): string {
  const env = process.env.PHONEPE_ENV || 'sandbox';
  return env === 'production' ? PHONEPE_API_BASE.production : PHONEPE_API_BASE.sandbox;
}

function generateChecksum(payload: string, apiEndpoint: string): string {
  const saltKey = process.env.PHONEPE_SALT_KEY || '';
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const dataToHash = payload + apiEndpoint + saltKey;
  const sha256Hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return sha256Hash + '###' + saltIndex;
}

/**
 * Initiates a PhonePe V1 payment via the Pay API
 */
export async function initiatePhonePePayment(
  orderId: string,
  amountInPaise: number,
  redirectUrl: string
): Promise<PhonePeInitiateResponse> {
  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID || '';
    
    if (!merchantId || !process.env.PHONEPE_SALT_KEY) {
      return {
        success: false,
        error: 'PhonePe credentials not configured. Set PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY in environment variables.',
      };
    }

    const payloadObj = {
      merchantId: merchantId,
      merchantTransactionId: orderId,
      merchantUserId: 'USER_' + orderId.split('_')[1],
      amount: amountInPaise,
      redirectUrl: redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: redirectUrl,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
    const apiEndpoint = '/pg/v1/pay';
    const checksum = generateChecksum(base64Payload, apiEndpoint);

    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const data = await response.json();

    if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
      return {
        success: true,
        redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        message: 'Payment initiated successfully',
      };
    }

    return {
      success: false,
      error: data.message || `PhonePe API returned code: ${data.code}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `PhonePe API Error: ${err.message || JSON.stringify(err)}`,
    };
  }
}

/**
 * Verifies payment status via PhonePe V1 Status API
 */
export async function checkPhonePeStatus(merchantTransactionId: string): Promise<boolean> {
  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID || '';
    const saltKey = process.env.PHONEPE_SALT_KEY || '';
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

    if (!merchantId || !saltKey) return false;

    const apiEndpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const dataToHash = apiEndpoint + saltKey;
    const sha256Hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    const checksum = sha256Hash + '###' + saltIndex;

    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}${apiEndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId,
      },
    });

    const data = await response.json();
    return data.success === true && data.code === 'PAYMENT_SUCCESS';
  } catch {
    return false;
  }
}
