import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@valhall/auth';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BongService } from './bong.service';
import { CreateShotDto } from './dto/bong.dto';

@Controller()
@ApiTags('Shots')
@ApiBearerAuth('keycloak')
@UseGuards(JwtAuthGuard)
export class BongController {
  constructor(private readonly bongService: BongService) {}

  @Post('add')
  addShot(
    @Body() body: CreateShotDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongService.addShot(body, authorization);
  }

  @Get('add/recent')
  recentActivity(
    @Headers('authorization') authorization: string,
    @Query('skip') skip?: string,
  ) {
    return this.bongService.recentActivity(authorization, Number(skip ?? 0));
  }
}
