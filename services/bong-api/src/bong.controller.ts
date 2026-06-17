import { Body, Controller, Get, Post } from '@nestjs/common';
import { BongService } from './bong.service';

@Controller()
export class BongController {
  constructor(private readonly bongService: BongService) {}

  @Get()
  getHello(): string {
    return this.bongService.getHello();
  }

  @Post('add')
  addShot(@Body() body: { name: string }) {
    return this.bongService.addShot(body);
  }
}
