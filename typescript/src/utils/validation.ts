/**
 * Ensures a required field is not undefined.
 * Throws with a clear error message if missing.
 *
 * @param value - The value to check.
 * @param fieldName - Field name for error context.
 * @returns The value, if not undefined.
 */
export function safeGet<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing required field: "${fieldName}"`);
  }
  return value;
}
