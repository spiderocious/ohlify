// Cursor-based pagination — the only pagination style used in this API.
// Cursor is base64url of { last_id, last_sort_key }.

export interface CursorPayload {
  last_id: string;
  last_sort_key: string;
}

export interface CursorPage<T> {
  items: T[];
  meta: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;
export const MAX_LIMIT_ADMIN = 100;

export const encodeCursor = (payload: CursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

// Decodes a cursor and validates the shape. Throws `Error('Invalid cursor')` on
// any failure (bad base64, malformed JSON, missing/wrong-type fields, empty
// strings). Callers translate into 400 validation_error.
export const decodeCursor = (cursor: string): CursorPayload => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid cursor');
  }
  const obj = parsed as Record<string, unknown>;
  const lastId = obj['last_id'];
  const lastSortKey = obj['last_sort_key'];
  if (
    typeof lastId !== 'string' ||
    lastId.length === 0 ||
    typeof lastSortKey !== 'string' ||
    lastSortKey.length === 0
  ) {
    throw new Error('Invalid cursor');
  }
  return { last_id: lastId, last_sort_key: lastSortKey };
};

export const resolveLimit = (limit?: number, max = MAX_LIMIT): number =>
  Math.min(max, Math.max(1, limit ?? DEFAULT_LIMIT));

export const buildCursorPage = <T>(
  items: T[],
  limit: number,
  toCursor: (item: T) => CursorPayload,
): CursorPage<T> => {
  const has_more = items.length > limit;
  const page = has_more ? items.slice(0, limit) : items;
  const last = page[page.length - 1];
  return {
    items: page,
    meta: {
      next_cursor: has_more && last !== undefined ? encodeCursor(toCursor(last)) : null,
      has_more,
    },
  };
};
