import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@valhall/auth';
import { BongmeisterService } from './bongmeister.service';
import {
  changeAmountDto,
  ModeratePenaltyDto,
} from './dto/moderate-penalty.dto';

@Controller('bongmeister')
@ApiTags('Bongmeister')
@ApiBearerAuth('keycloak')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.BONGMEISTER)
export class BongmeisterController {
  constructor(private readonly bongmeisterService: BongmeisterService) {}

  @Patch(':id')
  moderate(
    @Param('id') id: string,
    @Body() body: ModeratePenaltyDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongmeisterService.moderate(id, body, authorization);
  }

  @Patch('redeem/:id')
  moderateRedemption(
    @Param('id') id: string,
    @Body() body: ModeratePenaltyDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongmeisterService.moderateRedeem(id, body, authorization);
  }

  @Get('penalty-targets')
  getPenaltyTargets(@Headers('authorization') authorization: string) {
    return this.bongmeisterService.getPenaltyTargets(authorization);
  }

  @Patch('change-amount/:id')
  changeAmount(@Param('id') id: string, @Body() body: changeAmountDto) {
    return this.bongmeisterService.changeAmount(id, body.amount);
  }
}
