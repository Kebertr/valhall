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
import { PenaltyService } from './penalty.service';
import { CreatePenaltyDto } from './dto/penalty.dto';

@Controller()
@ApiTags('penalties')
@ApiBearerAuth('keycloak')
@UseGuards(JwtAuthGuard)
export class PenaltyController {
  constructor(private readonly penaltyService: PenaltyService) {}

  @Post('add')
  addPenalty(
    @Body() body: CreatePenaltyDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.penaltyService.addPenalty(body, authorization);
  }

  @Get('add/recent')
  recentActivity(
    @Headers('authorization') authorization: string,
    @Query('skip') skip?: string,
  ) {
    return this.penaltyService.recentActivity(authorization, Number(skip ?? 0));
  }
}
