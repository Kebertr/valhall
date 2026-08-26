import { Test, TestingModule } from '@nestjs/testing';
import { PenaltyController } from './penalty.controller';
import { PenaltyService } from './penalty.service';

jest.mock('@valhall/auth', () => ({
  JwtAuthGuard: class {},
}));

const penaltyServiceMock = {
  addPenalty: jest.fn(),
};

describe('PenaltyController', () => {
  let penaltyController: PenaltyController;
  let penaltyService: jest.Mocked<PenaltyService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PenaltyController],
      providers: [
        PenaltyService,
        { provide: PenaltyService, useValue: penaltyServiceMock },
      ],
    }).compile();

    penaltyController = app.get<PenaltyController>(PenaltyController);
    penaltyService = app.get<jest.Mocked<PenaltyService>>(PenaltyService);
  });

  describe('addPenalty', () => {
    it('returns ok when adding a penalty', async () => {
      const authorization = 'Bearer signed-token';

      penaltyService.addPenalty.mockResolvedValueOnce({
        ok: true,
        message: 'Added 550e8400-e29b-41d4-a716-446655440000',
        received: {
          Id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5,
          reason: 'Cool',
          status: 'pending',
          createdAt: '2026-08-20T12:00:00.000Z',
        },
      });

      const result = await penaltyController.addPenalty(
        {
          Id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5,
          reason: 'Cool',
        },
        authorization,
      );

      expect(penaltyService.addPenalty).toHaveBeenCalledWith(
        {
          Id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5,
          reason: 'Cool',
        },
        authorization,
      );

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Added 550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
