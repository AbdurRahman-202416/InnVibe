import { BadRequestException, Injectable } from '@nestjs/common';
import { assertText } from '../common/validation';
import { PaymentInput, PaymentMethod } from './booking.interface';

export interface PaymentReceipt {
  reference: string;
  last4: string;
  method: PaymentMethod;
}

/**
 * Test payment gateway. Nothing is charged and no card or wallet data is kept.
 * It only checks that the details have a valid LENGTH (card 16 digits, CVC 3-4 digits, expiry MM/YY,
 * mobile wallet number 11 digits, PIN 5 digits). Any details of the right length are approved.
 */
@Injectable()
export class PaymentsService {
  charge(amount: number, payment: PaymentInput): PaymentReceipt {
    if (amount <= 0) throw new BadRequestException('Nothing to charge');

    const method = payment?.method ?? 'card';
    // Card numbers, PINs etc. must arrive as text (a JSON number would lose leading zeros and break .replace()).
    for (const [key, value] of Object.entries(payment ?? {})) assertText(value, `payment.${key}`, { max: 60 });
    if (method === 'bkash' || method === 'nagad') {
      return this.chargeWallet(method, payment as Extract<PaymentInput, { method: 'bkash' | 'nagad' }>);
    }
    if (method !== 'card') throw new BadRequestException('Unsupported payment method');
    return this.chargeCard(payment as Extract<PaymentInput, { method: 'card' }>);
  }

  private chargeCard(payment: Extract<PaymentInput, { method: 'card' }>): PaymentReceipt {
    const digits = (payment.cardNumber ?? '').replace(/[\s-]/g, '');

    if (!/^\d{16}$/.test(digits)) throw new BadRequestException('Card number must be 16 digits');
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry ?? '')) throw new BadRequestException('Expiry must be in MM/YY format');
    if (!/^\d{3,4}$/.test(payment.cvc ?? '')) throw new BadRequestException('CVC must be 3 or 4 digits');

    return { reference: this.reference(), last4: digits.slice(-4), method: 'card' };
  }

  private chargeWallet(
    method: 'bkash' | 'nagad',
    payment: Extract<PaymentInput, { method: 'bkash' | 'nagad' }>,
  ): PaymentReceipt {
    const number = (payment.mobileNumber ?? '').replace(/[\s-]/g, '');
    const label = method === 'bkash' ? 'bKash' : 'Nagad';

    if (!/^\d{11}$/.test(number)) throw new BadRequestException(`${label} number must be 11 digits`);
    if (!/^\d{5}$/.test(payment.pin ?? '')) throw new BadRequestException(`${label} PIN must be 5 digits`);

    return { reference: this.reference(), last4: number.slice(-4), method };
  }

  private reference(): string {
    return `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }
}
