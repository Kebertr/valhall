import { validate } from 'class-validator';
import { PenaltyAction, ModeratePenaltyDto } from './moderate-penalty.dto';

describe('ModeratePenaltyDto', () => {
  it.each([0, -1, 1.5])('rejects invalid amount %s', async (amount) => {
    const dto = new ModeratePenaltyDto();
    dto.action = PenaltyAction.APPROVE;
    dto.amount = amount;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'amount')).toBe(true);
  });

  it('rejects an unsupported action', async () => {
    const dto = new ModeratePenaltyDto();
    dto.action = 'PENDING' as PenaltyAction;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'action')).toBe(true);
  });
});
