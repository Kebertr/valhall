import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedemptionService } from './redemption.service';
import { CreateRedemptionDto } from './dto/redemption.dto';

@ApiTags('Redemptions')
@Controller()
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redemption')
  @ApiOperation({ summary: 'Create a redemption request' })
  @ApiCreatedResponse({ description: 'Redemption request created' })
  redemptionShot(@Body() body: CreateRedemptionDto) {
    return this.redemptionService.RedemptionShot(body);
  }
}
