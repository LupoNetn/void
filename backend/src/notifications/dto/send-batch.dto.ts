import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SendNotificationDTO } from './send-notification.dto.js';

export class BatchNotificationItemDto extends SendNotificationDTO {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class SendNotificationBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BatchNotificationItemDto)
  notifications: BatchNotificationItemDto[];
}
