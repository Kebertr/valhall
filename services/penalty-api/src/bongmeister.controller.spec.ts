import { Test, type TestingModule } from '@nestjs/testing';
import { BongmeisterController } from './bongmeister.controller';
import { BongmeisterService } from './bongmeister.service';
import { PenaltyAction } from './dto/moderate-penalty.dto';

jest.mock('@valhall/auth', () => ({
  JwtAuthGuard: class {},
  RolesGuard: class {},
  Role: { ADMIN: 'ADMIN', BONGMEISTER: 'BONGMEISTER' },
  Roles: () => () => undefined,
}));

describe('BongmeisterController', () => {
  const bongmeisterService = {
    moderate: jest.fn(),
  };
  let controller: BongmeisterController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BongmeisterController],
      providers: [
        { provide: BongmeisterService, useValue: bongmeisterService },
      ],
    }).compile();

    controller = module.get(BongmeisterController);
  });

  it('forwards the penalty ID, decision and JWT to the service', async () => {
    const body = { action: PenaltyAction.APPROVE, amount: 4 };
    bongmeisterService.moderate.mockResolvedValueOnce({
      id: 'penalty-1',
      status: 'APPROVED',
      amount: 4,
    });

    await controller.moderate('penalty-1', body, 'Bearer signed-token');

    expect(bongmeisterService.moderate).toHaveBeenCalledWith(
      'penalty-1',
      body,
      'Bearer signed-token',
    );
  });
});
