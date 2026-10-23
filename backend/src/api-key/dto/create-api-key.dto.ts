import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString({ message: 'Key name must be a string.' })
  @IsNotEmpty({ message: 'Key name is required (e.g. Production Key, Staging Key).' })
  @MinLength(2, { message: 'Key name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Key name cannot exceed 100 characters.' })
  name: string;

  @IsOptional()
  @IsEnum(['live', 'test'], { message: 'Environment must be either "live" or "test".' })
  environment?: 'live' | 'test' = 'live';
}
