import dotenv from 'dotenv';
dotenv.config();

export function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable "${key}" is not set.`);
  }
  return value;
}
