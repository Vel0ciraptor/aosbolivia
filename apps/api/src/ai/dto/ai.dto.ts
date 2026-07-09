import { IsString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseRequestDto {
  @ApiProperty({ example: 'Necesito una bomba de gasolina para una Hilux 2019' })
  @IsString()
  text: string;
}

export class ChatDto {
  @ApiProperty({
    example: [{ role: 'user', content: 'Hola, necesito ayuda' }],
  })
  @IsArray()
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}
