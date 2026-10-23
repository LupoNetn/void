import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl({ require_tld: false }) url: string;
  @IsOptional() @IsString() @MaxLength(255) secret?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
