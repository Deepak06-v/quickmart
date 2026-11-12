import crypto from 'crypto';
import { env } from '../../config/env';
import { normalizeMobileWithCountry } from '../../utils/mobile';

export type OtpPurpose = 'AUTH' | 'ORDER_CONFIRMATION' | 'ACCOUNT_DELETION';

export interface SendOtpResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  code?: string;
  statusCode?: number;
  devOtp?: string; // Included only in development mode for developer testing
}

export interface ISmsProvider {
  name: string;
  sendOtp(mobile: string, otp: string, purpose: OtpPurpose): Promise<SendOtpResult>;
}

export interface ApitxtConfig {
  authKey: string;
  apiUrl: string;
  channel: string;
  country: string;
  templateId?: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

/**
 * Dev SMS Provider:
 * Logs the OTP to the backend console in development mode for local testing.
 */
export class DevSmsProvider implements ISmsProvider {
  name = 'dev';

  async sendOtp(mobile: string, otp: string, purpose: OtpPurpose): Promise<SendOtpResult> {
    if (env.NODE_ENV === 'development') {
      console.log('\n======================================================');
      console.log(`📱 [DEV SMS GATEWAY] Sending OTP to +91-${mobile}`);
      console.log(`🔑 Purpose: ${purpose}`);
      console.log(`🔒 Secure OTP: >>> ${otp} <<<`);
      console.log(`⏰ Valid for: ${env.OTP_EXPIRY_MINUTES} minutes`);
      console.log('======================================================\n');
    }

    return {
      success: true,
      provider: 'dev',
      messageId: `dev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      devOtp: env.NODE_ENV === 'development' ? otp : undefined,
    };
  }
}

/**
 * APITXT Unified OTP SMS Provider:
 * Sends form-urlencoded POST requests to https://apitxt.com/api/sendOTP.
 */
export class ApitxtSmsProvider implements ISmsProvider {
  name = 'apitxt';
  private config: ApitxtConfig;

  constructor(config?: Partial<ApitxtConfig>) {
    this.config = {
      authKey: config?.authKey ?? env.APITXT_AUTH_KEY,
      apiUrl: config?.apiUrl ?? env.APITXT_API_URL,
      channel: config?.channel ?? env.APITXT_CHANNEL,
      country: config?.country ?? env.APITXT_COUNTRY,
      templateId: config?.templateId ?? env.APITXT_TEMPLATE_ID,
      timeoutMs: config?.timeoutMs ?? env.APITXT_TIMEOUT_MS,
      fetchFn: config?.fetchFn ?? fetch,
    };
  }

  async sendOtp(mobile: string, otp: string, purpose: OtpPurpose): Promise<SendOtpResult> {
    const authKey = this.config.authKey.trim();
    if (!authKey) {
      console.error(`[APITXT] Missing APITXT_AUTH_KEY configuration (purpose=${purpose}).`);
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 503,
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        error: 'SMS service is not configured. Please contact support.',
      };
    }

    let normalizedMobile: string;
    try {
      normalizedMobile = normalizeMobileWithCountry(mobile, this.config.country);
    } catch (err: any) {
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 400,
        code: 'INVALID_MOBILE_NUMBER',
        error: err.message || 'Please provide a valid Indian mobile number.',
      };
    }

    const params = new URLSearchParams();
    params.append('authkey', authKey);
    params.append('mobile', normalizedMobile);
    params.append('otp', otp);
    params.append('channel', this.config.channel || 'sms');
    params.append('country', (this.config.country || '91').replace(/\D/g, '') || '91');

    const templateId = this.config.templateId?.trim();
    if (templateId) {
      params.append('template_id', templateId);
    }

    const controller = new AbortController();
    const timeoutMs = Number.isFinite(this.config.timeoutMs) && this.config.timeoutMs > 0
      ? this.config.timeoutMs
      : 15000;
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchImpl = this.config.fetchFn || fetch;
      const response = await fetchImpl(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let data: any = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error(`[APITXT] Non-JSON response received (status=${response.status}, purpose=${purpose}).`);
          return {
            success: false,
            provider: 'apitxt',
            statusCode: 502,
            code: 'SMS_PROVIDER_MALFORMED_RESPONSE',
            error: 'Unable to send OTP. Please try again.',
          };
        }
      }

      if (response.ok && data && data.status === 'success') {
        const requestId = data?.data?.request_id;
        return {
          success: true,
          provider: 'apitxt',
          messageId: requestId,
        };
      }

      return this.mapProviderFailure(response.status, data, purpose);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error(`[APITXT] Request timed out after ${timeoutMs}ms (purpose=${purpose}).`);
        return {
          success: false,
          provider: 'apitxt',
          statusCode: 504,
          code: 'SMS_PROVIDER_TIMEOUT',
          error: 'SMS service temporarily unavailable. Please try again.',
        };
      }

      console.error(`[APITXT] Network error while sending OTP (purpose=${purpose}):`, err?.message || 'Unknown error');
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 502,
        code: 'SMS_PROVIDER_UNAVAILABLE',
        error: 'Unable to send OTP. Please try again.',
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private mapProviderFailure(httpStatus: number, data: any, purpose: OtpPurpose): SendOtpResult {
    const rawMsg = typeof data?.message === 'string' ? data.message : '';
    const lowerMsg = rawMsg.toLowerCase();

    console.error(`[APITXT] Provider rejected OTP request (httpStatus=${httpStatus}, purpose=${purpose}, status=${data?.status ?? 'unknown'})`);

    if (httpStatus === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 429,
        code: 'SMS_RATE_LIMITED',
        error: 'Please wait before requesting another OTP.',
      };
    }

    if (
      lowerMsg.includes('invalid mobile') ||
      lowerMsg.includes('invalid number') ||
      lowerMsg.includes('phone')
    ) {
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 400,
        code: 'INVALID_MOBILE_NUMBER',
        error: 'Please provide a valid mobile number.',
      };
    }

    if (
      lowerMsg.includes('balance') ||
      lowerMsg.includes('credit') ||
      lowerMsg.includes('insufficient') ||
      lowerMsg.includes('auth') ||
      lowerMsg.includes('key') ||
      lowerMsg.includes('template') ||
      httpStatus === 401 ||
      httpStatus === 403
    ) {
      return {
        success: false,
        provider: 'apitxt',
        statusCode: 503,
        code: 'SMS_SERVICE_UNAVAILABLE',
        error: 'SMS service temporarily unavailable. Please try again later.',
      };
    }

    return {
      success: false,
      provider: 'apitxt',
      statusCode: 502,
      code: 'SMS_SEND_FAILED',
      error: 'Unable to send OTP. Please try again.',
    };
  }
}

/**
 * Fast2SMS Provider (Popular Indian SMS Gateway with Quick SMS & DLT routes):
 */
export class Fast2SmsProvider implements ISmsProvider {
  name = 'fast2sms';

  async sendOtp(mobile: string, otp: string): Promise<SendOtpResult> {
    if (!env.SMS_API_KEY || env.SMS_API_KEY === 'your_sms_gateway_api_key_here') {
      return {
        success: false,
        provider: 'fast2sms',
        statusCode: 503,
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        error: 'SMS service is not configured.',
      };
    }

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: env.SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: otp,
          route: 'otp',
          numbers: mobile,
        }),
      });

      const data = await response.json();
      if (data && data.return === true) {
        return {
          success: true,
          provider: 'fast2sms',
          messageId: data.request_id,
        };
      } else {
        return {
          success: false,
          provider: 'fast2sms',
          statusCode: 502,
          error: 'Unable to send OTP. Please try again.',
        };
      }
    } catch {
      return {
        success: false,
        provider: 'fast2sms',
        statusCode: 502,
        error: 'Unable to send OTP. Please try again.',
      };
    }
  }
}

/**
 * MSG91 Provider (Major Indian Telecom Enterprise Gateway):
 */
export class Msg91Provider implements ISmsProvider {
  name = 'msg91';

  async sendOtp(mobile: string, otp: string): Promise<SendOtpResult> {
    if (!env.SMS_API_KEY) {
      return {
        success: false,
        provider: 'msg91',
        statusCode: 503,
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        error: 'SMS service is not configured.',
      };
    }

    try {
      const formattedMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;
      const url = `https://control.msg91.com/api/v5/otp?template_id=${env.SMS_SENDER_ID}&mobile=${formattedMobile}&authkey=${env.SMS_API_KEY}&otp=${otp}`;

      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();

      if (data && data.type === 'success') {
        return {
          success: true,
          provider: 'msg91',
          messageId: data.message,
        };
      } else {
        return {
          success: false,
          provider: 'msg91',
          statusCode: 502,
          error: 'Unable to send OTP. Please try again.',
        };
      }
    } catch {
      return {
        success: false,
        provider: 'msg91',
        statusCode: 502,
        error: 'Unable to send OTP. Please try again.',
      };
    }
  }
}

export function getSmsProvider(): ISmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'apitxt':
      return new ApitxtSmsProvider();
    case 'fast2sms':
      return new Fast2SmsProvider();
    case 'msg91':
      return new Msg91Provider();
    case 'dev':
    default:
      return new DevSmsProvider();
  }
}

/**
 * Generates a cryptographically strong 6-digit numeric OTP (100000 - 999999).
 */
export function generateNumericOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}
