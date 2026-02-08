import { MeController } from './me.controller';

describe('MeController', () => {
  it('returns request context', () => {
    const c = new MeController();
    const ctx = { tenantId: 't1', sub: 's1' } as any;
    expect(c.getContext(ctx)).toBe(ctx);
  });
});
