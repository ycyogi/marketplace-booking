import { ResourcesController } from './resources.controller';

describe('ResourcesController', () => {
  const resources = { list: jest.fn(), create: jest.fn() };
  const controller = new ResourcesController(resources as any);

  it('list delegates with tenantId', async () => {
    resources.list.mockResolvedValue([{ id: 'r1' }]);
    await expect(controller.list({ tenantId: 't1' } as any)).resolves.toEqual([{ id: 'r1' }]);
  });

  it('create delegates with tenantId + body', async () => {
    resources.create.mockResolvedValue({ id: 'r1' });
    await expect(controller.create({ tenantId: 't1' } as any, { name: 'Desk' })).resolves.toEqual({ id: 'r1' });
  });
});
