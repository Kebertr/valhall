import { Module } from '@nestjs/common';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';

@Module({
  imports: [],
  controllers: [BongController],
  providers: [BongService],
})
export class BongModule {}
