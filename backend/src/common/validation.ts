import { BadRequestException } from '@nestjs/common';

/**
 * JSON bodies can contain anything: a number, an object like {"$ne": null}, an array.
 * Before a value is used as text (trim, replace, a database query) we check it really IS text,
 * so a malformed request gets a clear 400 instead of crashing the handler (500) or reaching the database.
 */
export function assertText(value: unknown, field: string, options: { required?: boolean; max?: number } = {}): void {
  if (value === undefined || value === null) {
    if (options.required) throw new BadRequestException(`${field} is required`);
    return;
  }
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
  if (options.max !== undefined && value.length > options.max) {
    throw new BadRequestException(`${field} must be ${options.max} characters or fewer`);
  }
}

/** Makes user text safe to put inside a regular expression ("a.b(c" must match literally, not as a pattern). */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
