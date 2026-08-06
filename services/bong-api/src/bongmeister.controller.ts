import {
  Body,
  Controller,
  Headers,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@valhall/auth';
import { BongmeisterService } from './bongmeister.service';
import { ModerateBongDto } from './dto/moderate-bong.dto';

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
    @Body() body: ModerateBongDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongmeisterService.moderate(id, body, authorization);
  }

  @Patch('redeem/:id')
  moderateRedemption(
    @Param('id') id: string,
    @Body() body: ModerateBongDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.bongmeisterService.moderateRedeem(id, body, authorization);
  }
}
