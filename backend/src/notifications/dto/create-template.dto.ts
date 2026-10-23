import { NotificationChannel } from "@prisma/client";
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, IsBoolean } from "class-validator";

export class CreateNotificationTemplate {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsEnum(NotificationChannel)
    channel: NotificationChannel
    @IsString()
    @IsOptional()
    subject?: string
    @IsString()
    body: string;
    @IsOptional()
    @IsNumber()
    version?: number
    @IsOptional()
    @IsBoolean()
    active?: boolean
}