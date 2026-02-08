import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService (unit)', () => {
  const tenantId = 'tenant-1';

  let db: {
    selectFrom: jest.Mock;
    insertInto: jest.Mock;
    updateTable: jest.Mock;
  };

  let resources: {
    assertBelongsToTenant: jest.Mock;
  };

  let idem: {
    get: jest.Mock;
    putIfAbsent: jest.Mock;
  };

  let service: BookingsService;

  const selectBuilder = (result: unknown, first = false) => {
    const b: any = {
      select: jest.fn(() => b),
      where: jest.fn(() => b),
      orderBy: jest.fn(() => b),
      execute: jest.fn(async () => result),
      executeTakeFirst: jest.fn(async () => result),
    };
    if (first) delete b.execute;
    return b;
  };

  const updateBuilder = (err?: unknown) => {
    const b: any = {
      set: jest.fn(() => b),
      where: jest.fn(() => b),
      execute: err ? jest.fn(async () => Promise.reject(err)) : jest.fn(async () => undefined),
    };
    return b;
  };

  beforeEach(() => {
    db = {
      selectFrom: jest.fn(),
      insertInto: jest.fn(),
      updateTable: jest.fn(),
    };

    resources = {
      assertBelongsToTenant: jest.fn(),
    };

    idem = {
      get: jest.fn(),
      putIfAbsent: jest.fn(),
    };

    service = new BookingsService(db as any, resources as any, idem as any);
  });

  it('list validates fromUtc', async () => {
    db.selectFrom.mockReturnValue(selectBuilder([], false));
    await expect(service.list(tenantId, { fromUtc: 'bad' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('list validates toUtc', async () => {
    db.selectFrom.mockReturnValue(selectBuilder([], false));
    await expect(service.list(tenantId, { toUtc: 'bad' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('list applies filters and executes', async () => {
    const rows = [{ id: 'b1' }];
    const b = selectBuilder(rows);
    db.selectFrom.mockReturnValue(b);

    const result = await service.list(tenantId, {
      resourceId: 'r1',
      fromUtc: '2026-02-08T10:00:00.000Z',
      toUtc: '2026-02-08T11:00:00.000Z',
    });

    expect(result).toEqual(rows);
    expect(b.where).toHaveBeenCalled();
    expect(b.orderBy).toHaveBeenCalledWith('start_utc', 'asc');
  });

  describe('hold', () => {
    it('throws for invalid range', async () => {
      await expect(
        service.hold(tenantId, {
          resourceId: 'resource-1',
          startUtc: '2026-02-08T19:00:00.000Z',
          endUtc: '2026-02-08T18:00:00.000Z',
          idempotencyKey: 'idem-2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws for invalid holdMinutes', async () => {
      await expect(
        service.hold(tenantId, {
          resourceId: 'resource-1',
          startUtc: '2026-02-08T18:00:00.000Z',
          endUtc: '2026-02-08T19:00:00.000Z',
          holdMinutes: 0,
          idempotencyKey: 'idem-3',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns hold payload on success', async () => {
      const insert = { values: jest.fn().mockReturnThis(), execute: jest.fn() };
      db.insertInto.mockReturnValue(insert);

      const result = await service.hold(tenantId, {
        resourceId: 'resource-1',
        startUtc: '2026-02-08T18:00:00.000Z',
        endUtc: '2026-02-08T19:00:00.000Z',
        idempotencyKey: 'idem-ok',
      });

      expect(resources.assertBelongsToTenant).toHaveBeenCalledWith('resource-1', tenantId);
      expect(result.status).toBe('HOLD');
      expect(insert.execute).toHaveBeenCalled();
    });

    it('maps overlap DB error to conflict', async () => {
      const insert = {
        values: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => Promise.reject({ code: '23P01' })),
      };
      db.insertInto.mockReturnValue(insert);

      await expect(
        service.hold(tenantId, {
          resourceId: 'resource-1',
          startUtc: '2026-02-08T18:00:00.000Z',
          endUtc: '2026-02-08T19:00:00.000Z',
          idempotencyKey: 'idem-overlap',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns existing row on idempotency unique violation', async () => {
      const insert = {
        values: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => Promise.reject({ code: '23505' })),
      };
      db.insertInto.mockReturnValue(insert);
      db.selectFrom.mockReturnValue(selectBuilder({ id: 'existing' }, true));

      const result = await service.hold(tenantId, {
        resourceId: 'resource-1',
        startUtc: '2026-02-08T18:00:00.000Z',
        endUtc: '2026-02-08T19:00:00.000Z',
        idempotencyKey: 'idem-dup',
      });

      expect(result).toEqual({ id: 'existing' });
    });
  });

  it('confirm validates date range', async () => {
    await expect(
      service.confirm(tenantId, {
        resourceId: 'resource-1',
        startUtc: '2026-02-08T19:00:00.000Z',
        endUtc: '2026-02-08T18:00:00.000Z',
        idempotencyKey: 'idem-bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirm inserts confirmed booking', async () => {
    const insert = { values: jest.fn().mockReturnThis(), execute: jest.fn() };
    db.insertInto.mockReturnValue(insert);

    const result = await service.confirm(tenantId, {
      resourceId: 'resource-1',
      startUtc: '2026-02-08T18:00:00.000Z',
      endUtc: '2026-02-08T19:00:00.000Z',
      idempotencyKey: 'idem-confirm',
    });

    expect(result.status).toBe('CONFIRMED');
  });

  it('confirm maps overlap violation', async () => {
    db.insertInto.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => Promise.reject({ code: '23P01' })),
    });

    await expect(
      service.confirm(tenantId, {
        resourceId: 'resource-1',
        startUtc: '2026-02-08T18:00:00.000Z',
        endUtc: '2026-02-08T19:00:00.000Z',
        idempotencyKey: 'idem-conflict',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirm throws duplicate request when no existing row', async () => {
    db.insertInto.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => Promise.reject({ code: '23505' })),
    });
    db.selectFrom.mockReturnValue(selectBuilder(undefined, true));

    await expect(
      service.confirm(tenantId, {
        resourceId: 'resource-1',
        startUtc: '2026-02-08T18:00:00.000Z',
        endUtc: '2026-02-08T19:00:00.000Z',
        idempotencyKey: 'idem-conflict',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('confirmHold', () => {
    it('returns previous idempotency response', async () => {
      const prev = { body: { id: 'booking-1', status: 'CONFIRMED' } };
      idem.get.mockResolvedValue(prev);

      const result = await service.confirmHold(tenantId, 'booking-1', 'idem-4');

      expect(result).toEqual(prev.body);
    });

    it('throws not found when booking missing', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder(undefined, true));

      await expect(service.confirmHold(tenantId, 'missing', 'idem-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns success when already confirmed', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(
        selectBuilder({ status: 'CONFIRMED', hold_expires_at: null }, true),
      );

      const result = await service.confirmHold(tenantId, 'b1', 'idem-x');

      expect(result).toEqual({ id: 'b1', status: 'CONFIRMED' });
      expect(idem.putIfAbsent).toHaveBeenCalled();
    });

    it('rejects unsupported status', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'CANCELED' }, true));

      await expect(service.confirmHold(tenantId, 'b1', 'idem-x')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects hold missing expiration', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'HOLD', hold_expires_at: null }, true));

      await expect(service.confirmHold(tenantId, 'b1', 'idem-x')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('expires stale hold then throws conflict', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(
        selectBuilder({ status: 'HOLD', hold_expires_at: new Date(Date.now() - 1000) }, true),
      );
      db.updateTable.mockReturnValue(updateBuilder());

      await expect(service.confirmHold(tenantId, 'b1', 'idem-x')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(db.updateTable).toHaveBeenCalled();
    });

    it('maps overlap error while confirming hold', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(
        selectBuilder({ status: 'HOLD', hold_expires_at: new Date(Date.now() + 60_000) }, true),
      );
      db.updateTable.mockReturnValue(updateBuilder({ code: '23P01' }));

      await expect(service.confirmHold(tenantId, 'b1', 'idem-x')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('confirms a valid hold', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(
        selectBuilder({ status: 'HOLD', hold_expires_at: new Date(Date.now() + 60_000) }, true),
      );
      db.updateTable.mockReturnValue(updateBuilder());

      await expect(service.confirmHold(tenantId, 'b1', 'idem-x')).resolves.toEqual({
        id: 'b1',
        status: 'CONFIRMED',
      });
      expect(idem.putIfAbsent).toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    it('returns previous idempotency response', async () => {
      const prev = { body: { id: 'booking-2', status: 'CONFIRMED' } };
      idem.get.mockResolvedValue(prev);

      const result = await service.reschedule(tenantId, 'booking-2', {
        startUtc: '2026-02-08T20:00:00.000Z',
        endUtc: '2026-02-08T21:00:00.000Z',
        idempotencyKey: 'idem-5',
      });

      expect(result).toEqual(prev.body);
    });

    it('throws when booking missing', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder(undefined, true));

      await expect(
        service.reschedule(tenantId, 'x', {
          startUtc: '2026-02-08T20:00:00.000Z',
          endUtc: '2026-02-08T21:00:00.000Z',
          idempotencyKey: 'k',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-confirmed booking', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'HOLD', resource_id: 'r1' }, true));

      await expect(
        service.reschedule(tenantId, 'b1', {
          startUtc: '2026-02-08T20:00:00.000Z',
          endUtc: '2026-02-08T21:00:00.000Z',
          idempotencyKey: 'k',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps overlap DB error on reschedule', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'CONFIRMED', resource_id: 'r1' }, true));
      db.updateTable.mockReturnValue(updateBuilder({ code: '23P01' }));

      await expect(
        service.reschedule(tenantId, 'b1', {
          startUtc: '2026-02-08T20:00:00.000Z',
          endUtc: '2026-02-08T21:00:00.000Z',
          idempotencyKey: 'k',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates confirmed booking and stores idempotency', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'CONFIRMED', resource_id: 'r1' }, true));
      db.updateTable.mockReturnValue(updateBuilder());

      const result = await service.reschedule(tenantId, 'b1', {
        startUtc: '2026-02-08T20:00:00.000Z',
        endUtc: '2026-02-08T21:00:00.000Z',
        idempotencyKey: 'k',
      });

      expect(result.status).toBe('CONFIRMED');
      expect(idem.putIfAbsent).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('returns previous idempotency response', async () => {
      idem.get.mockResolvedValue({ body: { id: 'booking-3', status: 'CANCELED' } });

      const result = await service.cancel(tenantId, 'booking-3', 'idem-6');
      expect(result).toEqual({ id: 'booking-3', status: 'CANCELED' });
    });

    it('throws when booking missing', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder(undefined, true));

      await expect(service.cancel(tenantId, 'missing', 'idem')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('does not update when already canceled', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'CANCELED' }, true));

      const result = await service.cancel(tenantId, 'b1', 'idem');
      expect(result).toEqual({ id: 'b1', status: 'CANCELED' });
      expect(db.updateTable).not.toHaveBeenCalled();
    });

    it('updates status when not already canceled', async () => {
      idem.get.mockResolvedValue(null);
      db.selectFrom.mockReturnValue(selectBuilder({ status: 'CONFIRMED' }, true));
      db.updateTable.mockReturnValue(updateBuilder());

      const result = await service.cancel(tenantId, 'b1', 'idem');

      expect(result).toEqual({ id: 'b1', status: 'CANCELED' });
      expect(db.updateTable).toHaveBeenCalled();
      expect(idem.putIfAbsent).toHaveBeenCalled();
    });
  });
});
