import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password, minimum 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RecruiterRegisterDto extends RegisterDto {
  @ApiProperty({ example: 'Northstar Technologies', description: 'Recruiter company or organization' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'The current account password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (12–128 characters)',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword: string;
}

export class SetActiveRoleDto {
  @ApiProperty({
    enum: Object.values(UserRole),
    example: UserRole.FACULTY,
    description: 'One of the signed-in user\'s own role assignments',
  })
  @IsIn(Object.values(UserRole))
  role: UserRole;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
