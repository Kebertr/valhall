import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@valhall/auth';
import { BongService } from './bong.service';
import { CreateShotDto } from './dto/bong.dto';

@Controller()
export class BongController {
  constructor(private readonly bongService: BongService) {}

  @Post('add')
  @UseGuards(JwtAuthGuard)
  addShot(@Body() body: CreateShotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bongService.addShot(body, user);
  }
}
