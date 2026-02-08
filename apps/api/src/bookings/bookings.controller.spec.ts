import { BookingsController } from './bookings.controller';

describe('BookingsController', () => {
  const bookings = {
    list: jest.fn(),
    hold: jest.fn(),
    confirm: jest.fn(),
    confirmHold: jest.fn(),
    reschedule: jest.fn(),
    cancel: jest.fn(),
  };

  const c = new BookingsController(bookings as any);
  const ctx: any = { tenantId: 't1' };

  it('delegates list', () => {
    c.list(ctx, { resourceId: 'r1' });
    expect(bookings.list).toHaveBeenCalledWith('t1', { resourceId: 'r1' });
  });

  it('delegates mutating routes', () => {
    c.hold(ctx, { resourceId: 'r1', startUtc: 's', endUtc: 'e', idempotencyKey: 'k' });
    c.confirm(ctx, { resourceId: 'r1', startUtc: 's', endUtc: 'e', idempotencyKey: 'k' });
    c.confirmHold(ctx, 'b1', { idempotencyKey: 'k' });
    c.reschedule(ctx, 'b1', { startUtc: 's', endUtc: 'e', idempotencyKey: 'k' });
    c.cancel(ctx, 'b1', { idempotencyKey: 'k' });

    expect(bookings.hold).toHaveBeenCalled();
    expect(bookings.confirm).toHaveBeenCalled();
    expect(bookings.confirmHold).toHaveBeenCalledWith('t1', 'b1', 'k');
    expect(bookings.reschedule).toHaveBeenCalled();
    expect(bookings.cancel).toHaveBeenCalledWith('t1', 'b1', 'k');
  });
});
