import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@valhall/auth';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@UseGuards(JwtAuthGuard)
@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('leaderboard/add')
  @ApiOperation({ summary: 'Get leaderboard for add' })
  @ApiCreatedResponse({ description: 'Leaderboard successfully retrieved' })
  @ApiBearerAuth('keycloak')
  getLeaderboardAdd(@Headers('authorization') authorization: string) {
    return this.leaderboardService.getLeaderboard(authorization, 'add');
  }

  @Get('leaderboard/redeem')
  @ApiOperation({ summary: 'Get leaderboard for redeem' })
  @ApiCreatedResponse({ description: 'Leaderboard successfully retrieved' })
  @ApiBearerAuth('keycloak')
  getLeaderboardRedeem(@Headers('authorization') authorization: string) {
    return this.leaderboardService.getLeaderboard(authorization, 'redeem');
  }
}
