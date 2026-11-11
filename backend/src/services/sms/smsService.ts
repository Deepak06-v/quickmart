import crypto from 'crypto';
import { env } from '../../config/env';

export interface SendOtpResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  devOtp?: string; // Included only in development mode for developer testing
}

export interface ISmsProvider {
  name: string;
  sendOtp(mobile: string, otp: string, purpose: 'AUTH' | 'ORDER_CONFIRMATION' | 'ACCOUNT_DELETION'): Promise<SendOtpResult>;
}

/**
 * Dev SMS Provider:
 * Logs the OTP securely to the backend console and returns devOtp in development mode
 * for easy mobile client testing without incurring SMS gateway charges.
 */
export class DevSmsProvider implements ISmsProvider {
  name = 'dev';

  async sendOtp(mobile: string, otp: string, purpose: 'AUTH' | 'ORDER_CONFIRMATION' | 'ACCOUNT_DELETION'): Promise<SendOtpResult> {
    console.log('\n======================================================');
    console.log(`📱 [DEV SMS GATEWAY] Sending OTP to +91-${mobile}`);
    console.log(`🔑 Purpose: ${purpose}`);
    console.log(`🔒 Secure OTP: >>> ${otp} <<<`);
    console.log(`⏰ Valid for: ${env.OTP_EXPIRY_MINUTES} minutes`);
    console.log('======================================================\n');

    return {
      success: true,
      provider: 'dev',
      messageId: `dev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      devOtp: env.NODE_ENV === 'development' ? otp : undefined,
    };
  }
}

/**
 * Fast2SMS Provider (Popular Indian SMS Gateway with Quick SMS & DLT routes):
 */
export class Fast2SmsProvider implements ISmsProvider {
  name = 'fast2sms';

  async sendOtp(mobile: string, otp: string, purpose: string): Promise<SendOtpResult> {
    if (!env.SMS_API_KEY || env.SMS_API_KEY === 'your_sms_gateway_api_key_here') {
      throw new Error('Fast2SMS API key is not configured in environment variables.');
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
          error: data?.message || 'Failed to send SMS via Fast2SMS',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'fast2sms',
        error: err.message,
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
      throw new Error('MSG91 auth key is not configured.');
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
          error: data?.message || 'Failed to send SMS via MSG91',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'msg91',
        error: err.message,
      };
    }
  }
}

export function getSmsProvider(): ISmsProvider {
  switch (env.SMS_PROVIDER) {
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
 * Generates a cryptographically strong 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}
