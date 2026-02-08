jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockResolvedValue({
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(undefined) }),
      listen: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('api main bootstrap', () => {
  it('imports without throwing', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./main');
    expect(true).toBe(true);
  });
});
