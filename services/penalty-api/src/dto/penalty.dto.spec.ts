import { validate } from 'class-validator';
import { CreatePenaltyDto } from './penalty.dto';

describe('CreatePenaltyDto', () => {
  const valid = () =>
    Object.assign(new CreatePenaltyDto(), {
      Id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 2,
      reason: 'Kom sent',
    });

  it('accepts a valid penalty', async () => {
    await expect(validate(valid())).resolves.toHaveLength(0);
  });
  it.each(['abc', '123', 'member-id', '', undefined])(
    'rejects invalid Id %s',
    async (Id) => {
      const dto = valid();
      dto.Id = Id as string;
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([expect.objectContaining({ property: 'Id' })]),
      );
    },
  );
  it.each([1, 2, 100])('accepts positive integer amount %s', async (amount) => {
    const dto = valid();
    dto.amount = amount;
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it.each([0, -1, -100, 1.5, '2', undefined, null])(
    'rejects invalid amount %s',
    async (amount) => {
      const dto = valid();
      dto.amount = amount as number;
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'amount' }),
        ]),
      );
    },
  );
  it.each([123, {}, [], undefined, null])(
    'rejects non-string or missing reason',
    async (reason) => {
      const dto = valid();
      dto.reason = reason as string;
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'reason' }),
        ]),
      );
    },
  );
  it.each(['', '   '])('accepts an empty reason: %j', async (reason) => {
    const dto = valid();
    dto.reason = reason;
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
