import { NotificationChannel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProviderDTO {
  @IsEnum(NotificationChannel, {
    message: 'Channel must be one of: EMAIL, SMS, PUSH, IN_APP, WEBHOOK',
  })
  @IsNotEmpty({ message: 'Channel is required.' })
  channel: NotificationChannel;

  @IsString({ message: 'Provider must be a string (e.g. sendgrid, twilio, fcm, resend).' })
  @IsNotEmpty({ message: 'Provider name is required.' })
  @MaxLength(100, { message: 'Provider name cannot exceed 100 characters.' })
  provider: string;

  /**
   * Sensitive provider-specific credential parameters:
   * e.g.
   * SendGrid / Resend: { apiKey: string, fromEmail?: string, fromName?: string }
   * Twilio: { accountSid: string, authToken: string, fromNumber?: string }
   * FCM: { serviceAccount: object }
   * SMTP: { host: string, port: number, user: string, pass: string, fromEmail: string }
   */
  @IsObject({ message: 'Credentials must be an object containing the provider configuration.' })
  @IsNotEmpty({ message: 'Credentials object is required.' })
  credentials: Record<string, any>;

  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean.' })
  active?: boolean = true;
}