import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import githubRoutes from './routes/github';
import reposRoutes from './routes/repos';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'GrokDev API is alive!' });
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/github', githubRoutes);
app.use('/repos', reposRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GrokDev API running on http://0.0.0.0:${PORT}`);
  console.log(`Local network: http://192.168.124.12:${PORT}`);
});
