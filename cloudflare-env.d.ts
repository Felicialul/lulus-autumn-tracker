interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface D1PreparedStatement {
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

interface R2ObjectBody {
  body: ReadableStream;
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: unknown): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    FILES?: R2Bucket;
  };
}
