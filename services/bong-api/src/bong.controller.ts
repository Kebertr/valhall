import { Body, Controller, Post } from '@nestjs/common';
import { BongService } from './bong.service';
import { CreateShotDto } from './dto/bong.dto';

@Controller()
export class BongController {
  constructor(private readonly bongService: BongService) {}

  @Post('add')
  addShot(@Body() body: CreateShotDto) {
    return this.bongService.addShot(body);
  }
}
