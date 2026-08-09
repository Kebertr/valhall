import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@valhall/auth';
import { RecentService } from './recent.service';
import { time } from 'console';

@ApiTags('Recent')
@UseGuards(JwtAuthGuard)
@Controller('recent')
export class RecentController {
  constructor(private readonly recentService: RecentService) {}

  @Get('activities')
  @ApiOperation({ summary: 'Get recent additions and redemptions' })
  @ApiBearerAuth('keycloak')
  recentActivities(@Headers('authorization') authorization: string,
    @Query("timestamp") timestamp?: string) {
    return this.recentService.recentActivities(authorization, timestamp);
  }
}
