import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(2, 160)
  company!: string;

  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsString()
  @Length(6, 120)
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
