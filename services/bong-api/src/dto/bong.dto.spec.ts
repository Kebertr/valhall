import { validate } from 'class-validator';
import { CreateShotDto } from './bong.dto';

describe('CreateShotDto', () => {
  it('rejects a negative shot amount', async () => {
    const dto = new CreateShotDto();
    dto.Id = '550e8400-e29b-41d4-a716-446655440000';
    dto.amount = -1;
    dto.reason = 'Testing a negative amount';

    const errors = await validate(dto);
    const amountError = errors.find((error) => error.property === 'amount');

    expect(amountError?.constraints).toHaveProperty('min');
  });

  it('rejects a decimal shot amount', async () => {
    const dto = new CreateShotDto();
    dto.Id = '550e8400-e29b-41d4-a716-446655440000';
    dto.amount = 1.5;
    dto.reason = 'Testing a decimal amount';

    const errors = await validate(dto);
    const amountError = errors.find((error) => error.property === 'amount');

    expect(amountError?.constraints).toHaveProperty('isInt');
  });
});
