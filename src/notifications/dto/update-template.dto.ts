import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationTemplateDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    body?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
