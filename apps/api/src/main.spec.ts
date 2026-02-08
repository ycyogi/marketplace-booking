jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockResolvedValue({
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(undefined) }),
      listen: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
}));

describe('api main bootstrap', () => {
  it('imports without throwing', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./main');
    expect(true).toBe(true);
  });
});
