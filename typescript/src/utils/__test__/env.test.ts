jest.mock('dotenv', () => ({
  config: jest.fn(() => ({
    parsed: {
      TEST_KEY: 'mocked-value',
    },
  })),
}));

import { getEnvVar } from '../env';

describe('env.ts', () => {
  beforeEach(() => {
    jest.resetModules(); 
    jest.clearAllMocks();
    process.env.TEST_KEY = 'mocked-value';
  });

  it('should return the value of an existing environment variable', () => {
    const value = getEnvVar('TEST_KEY');
    expect(value).toBe('mocked-value');
  });

  it('should throw an error if the environment variable is not set', () => {
    delete process.env.MISSING_KEY;
    expect(() => getEnvVar('MISSING_KEY')).toThrow(
      'Environment variable "MISSING_KEY" is not set.'
    );
  });
});
