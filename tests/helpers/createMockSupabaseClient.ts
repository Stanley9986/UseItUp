import { vi } from 'vitest';

export type MockSupabaseResult = {
  data?: unknown;
  error?: unknown;
};

export type MockSupabaseQueryCall = {
  method: string;
  args: unknown[];
};

export type MockSupabaseQuery = PromiseLike<MockSupabaseResult> & {
  table: string;
  calls: MockSupabaseQueryCall[];
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

export type MockSupabaseClient = {
  supabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
  queries: MockSupabaseQuery[];
  rpcCalls: { functionName: string; args: unknown }[];
  pushQueryResult: (result: MockSupabaseResult) => void;
  pushRpcResult: (result: MockSupabaseResult) => void;
  reset: () => void;
};

function createQuery(table: string, nextResult: () => MockSupabaseResult): MockSupabaseQuery {
  const calls: MockSupabaseQueryCall[] = [];
  const consumeResult = async () => nextResult();
  const query = {
    table,
    calls,
    delete: vi.fn(() => {
      calls.push({ method: 'delete', args: [] });
      return query;
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'eq', args });
      return query;
    }),
    in: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'in', args });
      return query;
    }),
    insert: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'insert', args });
      return query;
    }),
    limit: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'limit', args });
      return query;
    }),
    maybeSingle: vi.fn(() => {
      calls.push({ method: 'maybeSingle', args: [] });
      return consumeResult();
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'order', args });
      return query;
    }),
    select: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'select', args });
      return query;
    }),
    single: vi.fn(() => {
      calls.push({ method: 'single', args: [] });
      return consumeResult();
    }),
    then: ((onfulfilled, onrejected) => consumeResult().then(onfulfilled, onrejected)) as PromiseLike<MockSupabaseResult>['then'],
    update: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'update', args });
      return query;
    }),
    upsert: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'upsert', args });
      return query;
    }),
  };

  return query;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const queryResults: MockSupabaseResult[] = [];
  const rpcResults: MockSupabaseResult[] = [];
  const queries: MockSupabaseQuery[] = [];
  const rpcCalls: { functionName: string; args: unknown }[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      const query = createQuery(table, () => queryResults.shift() ?? { data: null, error: null });
      queries.push(query);
      return query;
    }),
    rpc: vi.fn(async (functionName: string, args: unknown) => {
      rpcCalls.push({ functionName, args });
      return rpcResults.shift() ?? { data: null, error: null };
    }),
  };

  return {
    supabase,
    queries,
    rpcCalls,
    pushQueryResult: (result) => {
      queryResults.push(result);
    },
    pushRpcResult: (result) => {
      rpcResults.push(result);
    },
    reset: () => {
      queryResults.length = 0;
      rpcResults.length = 0;
      queries.length = 0;
      rpcCalls.length = 0;
      supabase.from.mockClear();
      supabase.rpc.mockClear();
    },
  };
}
