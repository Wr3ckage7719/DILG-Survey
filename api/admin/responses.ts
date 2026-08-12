import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleResponses, setCorsHeaders } from '../_admin-shared';

/** POST /api/admin/responses  { token } → { ok, rows, headers, count } */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(res, req.headers.origin as string | undefined);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  await handleResponses(req, res);
}
