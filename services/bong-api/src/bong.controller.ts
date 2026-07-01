import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@valhall/auth';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BongService } from './bong.service';
import { CreateShotDto } from './dto/bong.dto';

@Controller()
@ApiTags('Shots')
@ApiBearerAuth('keycloak')
export class BongController {
  constructor(private readonly bongService: BongService) {}

  @Post('add')
  @UseGuards(JwtAuthGuard)
  addShot(
    @Body() body: CreateShotDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongService.addShot(body, authorization);
  }

  @Get('add/recent')
  @UseGuards(JwtAuthGuard)
  recentActivity(@Headers('authorization') authorization: string) {
    return this.bongService.recentActivity(authorization);
  }
}
