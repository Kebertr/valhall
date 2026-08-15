import { validate } from 'class-validator';
import { BongAction, ModerateBongDto } from './moderate-bong.dto';

describe('ModerateBongDto', () => {
  it.each([0, -1, 1.5])('rejects invalid amount %s', async (amount) => {
    const dto = new ModerateBongDto();
    dto.action = BongAction.APPROVE;
    dto.amount = amount;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'amount')).toBe(true);
  });

  it('rejects an unsupported action', async () => {
    const dto = new ModerateBongDto();
    dto.action = 'PENDING' as BongAction;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'action')).toBe(true);
  });
});
