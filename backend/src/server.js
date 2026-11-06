import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { isAllowedOrigin, readAllowedOrigins } from './cors.config.js';
import { health } from './controllers/health.controller.js';
import inventoryRouter from './routes/inventory.js';
import authRouter from './routes/auth.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = readAllowedOrigins();

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin, allowedOrigins)) }));
app.use(express.json({ limit: '32kb' }));
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    console.log(`${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.get('/api/health', health);
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Đã có lỗi máy chủ. Vui lòng thử lại.' });
});
app.listen(port, () => console.log(`API pantry đang chạy tại http://localhost:${port}`));
