import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer"


export class LoginDTO {
    @IsEmail({}, { message: 'Please provide a valid email address.' })
    @IsNotEmpty({ message: 'Email address is required.' })
    @MaxLength(255, { message: 'Email cannot exceed 255 characters.' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email: string;

    @IsString({ message: 'Password should be a string provide a valid'})
    @MinLength(6, {message: 'Password cannot be less than 6'}) 
    password: string;
}