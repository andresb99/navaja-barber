import { ZodSchema } from 'zod';

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

export async function parseApiJson<T>(response: Response, schema: ZodSchema<T>): Promise<ApiResult<T>> {
  if (!response.ok) {
    const text = await response.text();
    return { data: null, error: text || `Request failed (${response.status})` };
  }

  const json = await response.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return { data: null, error: parsed.error.flatten().formErrors.join(', ') || 'Invalid response' };
  }

  return { data: parsed.data, error: null };
}

