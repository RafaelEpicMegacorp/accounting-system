describe('Basic Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have access to test database URL', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});