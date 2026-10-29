import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { MensajeChatDto } from './dto/mensaje-chat.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbot: ChatbotService) {}

  @Post('mensaje')
  @UseGuards(OptionalJwtAuthGuard)
  enviarMensaje(@Req() req: any, @Body() dto: MensajeChatDto) {
    return this.chatbot.responder(dto.sesionId, dto.mensaje, req.user?.id, dto.localId);
  }

  @Get('historial')
  historial(@Query('sesionId') sesionId: string) {
    return this.chatbot.historial(sesionId);
  }
}
