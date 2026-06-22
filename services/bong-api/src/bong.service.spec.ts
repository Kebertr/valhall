import { Test, TestingModule } from '@nestjs/testing'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { BongService } from './bong.service'
import { PrismaService } from './prisma.service'

//Mock Prisma
jest.mock('./prisma.service', () => ({
  PrismaService: jest.fn(),
}));

//Creates a bongservice with the mock prisma
describe('BongService', () => {
  let service: BongService;
  let prisma: DeepMockProxy<PrismaService>;
    
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BongService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaService>())
      .compile();
    
    service = module.get(BongService);
    prisma = module.get(PrismaService);
  });
    

  it('add a bong', async () => {
    //Mocking body sent from frontend
    const body = {
        name: 'Rasmus',
        amount: 5,
        reason: 'testing',
    };

    //Answer from prisma and db in the test
    prisma.shot.create.mockResolvedValueOnce({
        id: 'shot-1',
        fromName: 'Rasmus',
        toName: body.name,
        amount: body.amount,
        reason: body.reason,
        status: 'pending',
        createdAt: new Date('2026-06-18T00:00:00.000Z'),
    });

    const result = await service.addShot(body);

    //Cehck so it is right
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.shot.create).toHaveBeenCalledWith({
        data: {
        toName: body.name,
        amount: body.amount,
        reason: body.reason,
        fromName: 'Rasmus',
        },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Added Rasmus');
    expect(result.received).toMatchObject({
        name: body.name,
        amount: body.amount,
        reason: body.reason,
        status: 'pending',
    });
    });

});
