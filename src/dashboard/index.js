import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3002;

// Enable CORS
app.use(cors());

// Serve static files from the dashboard directory
app.use(express.static(__dirname));

// Default route redirects to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
  console.log(`Using Ponder API at http://localhost:${API_PORT}/api`);
  console.log(`Make sure Ponder is running on port ${API_PORT} with 'PORT=3001 API_PORT=${API_PORT} yarn dev'`);
}); 