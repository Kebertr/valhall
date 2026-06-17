import { Test, TestingModule } from '@nestjs/testing';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';

describe('BongController', () => {
  let bongController: BongController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BongController],
      providers: [BongService],
    }).compile();

    bongController = app.get<BongController>(BongController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(bongController.getHello()).toBe('Hello World!');
    });
  });

  describe('add', () => {
    it('should return ok when adding a shot', () => {
      expect(bongController.addShot({ name: 'Thor' })).toEqual({
        ok: true,
        message: 'Added Thor',
      });
    });
  });
});
