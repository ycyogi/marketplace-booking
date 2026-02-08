import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let db: any;
  let service: IdempotencyService;

  beforeEach(() => {
    db = { selectFrom: jest.fn(), insertInto: jest.fn() };
    service = new IdempotencyService(db);
  });

  it('get returns null when absent', async () => {
    const b: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue(undefined),
    };
    db.selectFrom.mockReturnValue(b);
    await expect(service.get('t1', 'k1')).resolves.toBeNull();
  });

  it('get returns stored response', async () => {
    const b: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest
        .fn()
        .mockResolvedValue({ response_status: 200, response_body: { ok: true } }),
    };
    db.selectFrom.mockReturnValue(b);
    await expect(service.get('t1', 'k1')).resolves.toEqual({ status: 200, body: { ok: true } });
  });

  it('putIfAbsent writes with conflict do nothing', async () => {
    const oc = { columns: jest.fn().mockReturnThis(), doNothing: jest.fn() };
    const b: any = {
      values: jest.fn().mockReturnThis(),
      onConflict: jest.fn((fn: any) => {
        fn(oc);
        return b;
      }),
      execute: jest.fn(),
    };
    db.insertInto.mockReturnValue(b);

    await service.putIfAbsent('t1', 'k1', 200, { ok: true });
    expect(oc.columns).toHaveBeenCalledWith(['tenant_id', 'key']);
  });
});
