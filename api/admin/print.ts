import type { IncomingMessage, ServerResponse } from 'node:http';
import { handlePrint, setCorsHeaders } from '../_admin-shared';

/** POST /api/admin/print  { token, row, tpl } → { ok, url } */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(res, req.headers.origin as string | undefined);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  await handlePrint(req, res);
}
