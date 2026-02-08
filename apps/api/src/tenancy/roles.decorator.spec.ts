import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('exports metadata key and decorator', () => {
    expect(ROLES_KEY).toBe('roles');
    expect(Roles).toBeDefined();
  });
});
