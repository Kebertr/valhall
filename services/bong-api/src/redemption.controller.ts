import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RedemptionService } from './redemption.service';
import { CreateRedemptionDto } from './dto/redemption.dto';
import { JwtAuthGuard } from '@valhall/auth';

@ApiTags('Redemptions')
@UseGuards(JwtAuthGuard)
@Controller()
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redemption')
  @ApiOperation({ summary: 'Create a redemption request' })
  @ApiCreatedResponse({ description: 'Redemption request created' })
  @ApiBearerAuth('keycloak')
  createRedemption(
    @Body() body: CreateRedemptionDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.redemptionService.createRedemption(body, authorization);
  }

  @Post('redemption/complete-upload')
  @ApiOperation({ summary: 'Complete the redemption upload' })
  @ApiCreatedResponse({ description: 'Redemption upload completed' })
  @ApiBearerAuth('keycloak')
  completeRedemptionUpload(
    @Body('redemptionId') redemptionId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.redemptionService.completeRedemptionUpload(
      redemptionId,
      authorization,
    );
  }

  @Get('redemption/recent')
  @ApiOperation({ summary: 'Get recent completed redemptions' })
  @ApiBearerAuth('keycloak')
  recentRedemptions(
    @Headers('authorization') authorization: string,
    @Query('skip') skip?: string,
  ) {
    return this.redemptionService.recentRedemptions(
      authorization,
      Number(skip ?? 0),
    );
  }
}
