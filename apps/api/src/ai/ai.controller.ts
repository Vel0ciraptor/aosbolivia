import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ParseRequestDto, ChatDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('parse-request')
  @ApiOperation({ summary: 'Parsear texto libre y detectar categoría automotriz' })
  parseRequest(@Body() dto: ParseRequestDto) {
    return this.aiService.parseRequest(dto.text);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chatbot IA automotriz (demo)' })
  async chat(@Body() dto: ChatDto, @Req() req: any) {
    const response = await this.aiService.chat(dto.messages, req.user.id);
    return { response };
  }
}
