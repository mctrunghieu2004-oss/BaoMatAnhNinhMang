import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import './config.js';                                   // dung ngay neu thieu JWT_SECRET
import { apiLimiter } from './middleware/limits.js';
import { router as authRouter } from './routes/auth.js';
import { router as gradeRouter } from './routes/grades.js';
import { router as adminRouter } from './routes/admin.js';
import { startDetectors } from './services/detect.js';

const app = express();
app.set('trust proxy', 1);                             // chi tin X-Forwarded-For tu 1 hop (WAF)
app.use(helmet());                                     // CSP, X-Frame-Options, nosniff, an X-Powered-By
app.use(express.json({ limit: '10kb' }));              // chan body qua lon
app.use(cookieParser());
app.use(express.static('public', { index: 'login.html' }));

app.use('/api', apiLimiter);
app.use('/api', (req, res, next) => {                  // request thay doi du lieu phai la JSON
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json'))
    return res.status(415).json({ error: 'JSON_ONLY' });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api', gradeRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {                     // khong lo stack trace ra client
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

startDetectors();
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`app listening on ${port}`));
