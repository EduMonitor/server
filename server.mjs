// server.mjs
import http from "http";
import dotenv from "dotenv";
import connectDB from "./src/database/db.databases.mjs";
import { logger } from "./src/app/config/logger.config.mjs";
import { initSocket } from "./socket.mjs";
import app from './app.mjs'; // ← ne pas redéfinir app en bas !

dotenv.config();
connectDB();

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
});
