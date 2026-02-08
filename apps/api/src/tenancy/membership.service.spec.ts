import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  let db: any;
  let redis: any;
  let service: MembershipService;

  beforeEach(() => {
    db = { selectFrom: jest.fn() };
    redis = { get: jest.fn(), set: jest.fn() };
    service = new MembershipService(db, redis);
  });

  it('returns cached value when present', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'u1', role: 'admin', status: 'active' }));
    await expect(service.getMembershipBySub('sub', 't1')).resolves.toEqual({ userId: 'u1', role: 'admin', status: 'active' });
  });

  it('returns null and caches sentinel when DB miss', async () => {
    redis.get.mockResolvedValue(null);
    const b: any = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue(undefined),
    };
    db.selectFrom.mockReturnValue(b);

    await expect(service.getMembershipBySub('sub', 't1')).resolves.toBeNull();
    expect(redis.set).toHaveBeenCalled();
  });
});
