import { Test, TestingModule } from '@nestjs/testing';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';

const bongServiceMock = {
  addShot: jest.fn(),
};

describe('BongController', () => {
  let bongController: BongController;
  let bongService: jest.Mocked<BongService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BongController],
      providers: [BongService, { provide: BongService, useValue: bongServiceMock }],
    }).compile();

    bongController = app.get<BongController>(BongController);
    bongService = app.get<jest.Mocked<BongService>>(BongService);
  });

  describe('addShot', () => {
    it('should return ok when adding a shot', async () => {

      bongService.addShot.mockResolvedValueOnce({
        ok: true,
        message: 'Added Rasmus',
        received: { name: 'Rasmus', amount: 5, reason: 'Cool', status: 'pending' },
      });

      const result = await bongController.addShot({ name: 'Rasmus', amount: 5, reason: 'Cool' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bongService.addShot).toHaveBeenCalledWith({ name: 'Rasmus', amount: 5, reason: 'Cool' });

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Added Rasmus');
    });
  });
});
