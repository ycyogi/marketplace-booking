import { NotFoundException } from '@nestjs/common';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  let db: any;
  let service: ResourcesService;

  beforeEach(() => {
    db = { selectFrom: jest.fn(), insertInto: jest.fn() };
    service = new ResourcesService(db);
  });

  it('list returns tenant resources', async () => {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([{ id: 'r1' }]),
    };
    db.selectFrom.mockReturnValue(builder);

    await expect(service.list('t1')).resolves.toEqual([{ id: 'r1' }]);
  });

  it('create inserts and returns resource', async () => {
    const insert: any = { values: jest.fn().mockReturnThis(), execute: jest.fn() };
    db.insertInto.mockReturnValue(insert);

    const result = await service.create('t1', { name: 'Desk' });
    expect(result.tenantId).toBe('t1');
    expect(result.name).toBe('Desk');
    expect(insert.execute).toHaveBeenCalled();
  });

  it('assertBelongsToTenant throws when missing', async () => {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue(undefined),
    };
    db.selectFrom.mockReturnValue(builder);

    await expect(service.assertBelongsToTenant('r1', 't1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
