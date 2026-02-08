jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('worker main bootstrap', () => {
  it('imports without throwing', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./main');
    expect(true).toBe(true);
  });
});
