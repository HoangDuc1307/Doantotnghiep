import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = process.env.AUTH_SECRET;

export function authenticate(request, response, next) {
  const token = request.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !secret) return response.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' }); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
  }
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!user.sub || user.exp < Date.now()) throw new Error('expired');
    request.user = { id: user.sub, name: user.name };
    next();
  } catch {
    response.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
}
