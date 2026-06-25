import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 160)
  companyName!: string;

  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsString()
  @Length(8, 120)
  password!: string;

  @IsString()
  @Length(10, 1000)
  challengeToken!: string;

  @IsString()
  @Length(1, 10)
  challengeAnswer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
