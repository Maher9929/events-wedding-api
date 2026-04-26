import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto, UserRole } from '../users/dto/create-user.dto';
import { CreateBookingDto, UpdateBookingStatusDto } from '../bookings/dto/create-booking.dto';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';
import { CreateMessageDto } from '../messages/dto/create-message.dto';

// Helper: convert plain object to DTO instance and validate
async function validateDto<T extends object>(
  DtoClass: new () => T,
  plain: Record<string, any>,
): Promise<string[]> {
  const instance = plainToInstance(DtoClass, plain);
  const errors = await validate(instance);
  return errors.flatMap((e) => Object.values(e.constraints || {}));
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateUserDto
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateUserDto validation', () => {
  it('should pass with valid data', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is missing', async () => {
    const errors = await validateDto(CreateUserDto, {
      password: 'secret123',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('should fail when email is invalid', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'not-an-email',
      password: 'secret123',
    });
    expect(errors.some((e) => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('should fail when password is too short', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'test@example.com',
      password: '12345',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when password is missing', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'test@example.com',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid role', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'test@example.com',
      password: 'secret123',
      role: 'superuser',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with valid role', async () => {
    const errors = await validateDto(CreateUserDto, {
      email: 'test@example.com',
      password: 'secret123',
      role: UserRole.CLIENT,
    });
    expect(errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateBookingDto
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateBookingDto validation', () => {
  const validBooking = {
    provider_id: 'provider-uuid',
    booking_date: '2025-06-15',
    amount: 5000,
  };

  it('should pass with valid data', async () => {
    const errors = await validateDto(CreateBookingDto, validBooking);
    expect(errors).toHaveLength(0);
  });

  it('should fail when provider_id is missing', async () => {
    const { provider_id, ...rest } = validBooking;
    const errors = await validateDto(CreateBookingDto, rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when booking_date is not a date string', async () => {
    const errors = await validateDto(CreateBookingDto, {
      ...validBooking,
      booking_date: 'not-a-date',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when amount is negative', async () => {
    const errors = await validateDto(CreateBookingDto, {
      ...validBooking,
      amount: -100,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when amount is missing', async () => {
    const { amount, ...rest } = validBooking;
    const errors = await validateDto(CreateBookingDto, rest);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid status enum', async () => {
    const errors = await validateDto(CreateBookingDto, {
      ...validBooking,
      status: 'invalid_status',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with valid optional fields', async () => {
    const errors = await validateDto(CreateBookingDto, {
      ...validBooking,
      deposit_amount: 500,
      guest_count: 50,
      notes: 'Special requirements',
      requirements: ['chairs', 'tables'],
    });
    expect(errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UpdateBookingStatusDto
// ─────────────────────────────────────────────────────────────────────────────
describe('UpdateBookingStatusDto validation', () => {
  it('should pass with valid status', async () => {
    const errors = await validateDto(UpdateBookingStatusDto, {
      status: 'confirmed',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail with missing status', async () => {
    const errors = await validateDto(UpdateBookingStatusDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid status', async () => {
    const errors = await validateDto(UpdateBookingStatusDto, {
      status: 'unknown',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateReviewDto
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateReviewDto validation', () => {
  it('should pass with valid data', async () => {
    const errors = await validateDto(CreateReviewDto, {
      service_id: 'svc-uuid',
      rating: 5,
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when service_id is missing', async () => {
    const errors = await validateDto(CreateReviewDto, { rating: 5 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when rating is below 1', async () => {
    const errors = await validateDto(CreateReviewDto, {
      service_id: 'svc-uuid',
      rating: 0,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when rating is above 5', async () => {
    const errors = await validateDto(CreateReviewDto, {
      service_id: 'svc-uuid',
      rating: 6,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when rating is missing', async () => {
    const errors = await validateDto(CreateReviewDto, {
      service_id: 'svc-uuid',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with optional comment', async () => {
    const errors = await validateDto(CreateReviewDto, {
      service_id: 'svc-uuid',
      rating: 4,
      comment: 'Great service!',
    });
    expect(errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateMessageDto
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateMessageDto validation', () => {
  it('should pass with valid data', async () => {
    const errors = await validateDto(CreateMessageDto, {
      conversation_id: 'conv-uuid',
      content: 'Hello!',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when content is empty', async () => {
    const errors = await validateDto(CreateMessageDto, {
      conversation_id: 'conv-uuid',
      content: '',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when content is missing', async () => {
    const errors = await validateDto(CreateMessageDto, {
      conversation_id: 'conv-uuid',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid type enum', async () => {
    const errors = await validateDto(CreateMessageDto, {
      content: 'Hi',
      type: 'invalid_type',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with valid type', async () => {
    const errors = await validateDto(CreateMessageDto, {
      content: 'Hi',
      conversation_id: 'conv-uuid',
      type: 'text',
    });
    expect(errors).toHaveLength(0);
  });
});
