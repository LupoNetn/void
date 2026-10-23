

import { NotificationChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional,
  IsString, MaxLength, ValidateNested,
} from 'class-validator';

export class RecipientDto {
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() pushToken?: string;
  @IsOptional() @IsString() webhookUrl?: string;
  @IsOptional() @IsString() externalUserId?: string;
  @IsOptional() @IsString() name?: string;
}

export class SendNotificationDTO {
  @IsEnum(NotificationChannel) channel: NotificationChannel;
  @IsObject() @ValidateNested() @Type(() => RecipientDto) recipient: RecipientDto;
  @IsOptional() @IsString() template?: string;
  @IsOptional() @IsObject() variables?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsString() @IsNotEmpty() content?: string;
  @IsOptional() @IsString() @MaxLength(255) externalId?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
