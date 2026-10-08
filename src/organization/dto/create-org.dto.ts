import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOrganizationDto {
  @IsString({ message: 'Organization name must be a string.' })
  @IsNotEmpty({ message: 'Organization name is required.' })
  @MinLength(2, { message: 'Organization name must be at least 2 characters.' })
  @MaxLength(255, { message: 'Organization name cannot exceed 255 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters.' })
  password: string;

  @IsOptional()
  @IsString({ message: 'Slug must be a string.' })
  @MaxLength(255, { message: 'Slug cannot exceed 255 characters.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. acme-corp).',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  slug?: string;
}
