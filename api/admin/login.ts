import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleLogin, setCorsHeaders } from '../../lib/_admin-shared';

/** POST /api/admin/login  { password } â†’ { ok, token } */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(res, req.headers.origin as string | undefined);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  await handleLogin(req, res);
}
