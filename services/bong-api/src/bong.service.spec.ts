import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { BongService } from './bong.service';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

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
      providers: [
        BongService,
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://member-api:3002'),
          },
        },
      ],
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
      Id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 5,
      reason: 'testing',
    };
    const authorization = 'Bearer signed-token';
    const participants = {
      fromId: 'sender-member-uuid',
      toId: 'target-member-uuid',
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(participants),
    } as Response);

    //Answer from prisma and db in the test
    prisma.add.create.mockResolvedValueOnce({
      id: 'shot-1',
      fromId: participants.fromId,
      toId: participants.toId,
      amount: body.amount,
      reason: body.reason,
      status: 'pending',
      createdAt: new Date('2026-06-18T00:00:00.000Z'),
    });

    const result = await service.addShot(body, authorization);

    expect(fetch).toHaveBeenCalledWith(
      'http://member-api:3002/api/members/shot-participants',
      {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetMemberRecordId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      },
    );

    //Cehck so it is right
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.add.create).toHaveBeenCalledWith({
      data: {
        toId: participants.toId,
        amount: body.amount,
        reason: body.reason,
        fromId: participants.fromId,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Added 550e8400-e29b-41d4-a716-446655440000');
    expect(result.received).toMatchObject({
      Id: body.Id,
      amount: body.amount,
      reason: body.reason,
      status: 'pending',
    });
  });
});
