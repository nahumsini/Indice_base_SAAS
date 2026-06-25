import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Length, ValidateNested } from 'class-validator';

export class CurrentUserPhoneDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  @Length(1, 40)
  label!: string;

  @IsString()
  @Length(1, 40)
  phone!: string;

  @IsOptional()
  @IsString()
  @Length(0, 10)
  country?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class UpdateCurrentUserDto {
  @IsString()
  @Length(1, 100)
  primer_nombre!: string;

  @IsString()
  @Length(1, 100)
  apellido_paterno!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  telefono?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentUserPhoneDto)
  phone_numbers?: CurrentUserPhoneDto[];

  @IsOptional()
  @IsString()
  @Length(0, 10)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  preferred_language?: string;

  @IsOptional()
  @IsString()
  new_password?: string;

  @IsOptional()
  @IsString()
  confirm_new_password?: string;
}
