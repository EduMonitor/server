// socket.mjs
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Users } from "./src/app/models/users.models.mjs";


let io; // Holds the socket instance for global access

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://self-sec.com",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // JWT middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  // Handle connection
  io.on("connection", async (socket) => {
    const userId = socket.user?.uuid;
    const userIp = socket.request.socket.remoteAddress;

    logger.info(`New client connected: ${socket.id}`);

    if (userId) {
      try {
        await Users.findOneAndUpdate(
          { uuid: userId },
          {
            isOnline: true,
            socketId: socket.id,
            lastLoginIp: userIp,
          }
        );
        socket.join(userId);
      } catch (err) {
        logger.error(`Error setting user online: ${err.message}`);
      }
    }

    socket.on("send_message", async ({ receiverId, message }) => {
      const payload = {
        sender: userId,
        receiver: receiverId,
        name: message.name,
        text: message.text,
        createdAt: new Date(),
      };

      try {
       await Message.create(payload);
      } catch (err) {
        logger.error("Error saving message:", err.message);
      }

      io.to(receiverId).emit("receive_message", payload);
      socket.emit("receive_message", payload);
    });

    socket.on("disconnect", async () => {
      logger.info(`Client disconnected: ${socket.id}`);

      if (userId) {
        try {
          await Users.findOneAndUpdate(
            { uuid: userId },
            {
              isOnline: false,
              socketId: null,
              lastLoginIp: null,
              lastSeen: new Date(),
            }
          );
        } catch (err) {
          logger.error(`Error setting user offline: ${err.message}`);
        }
      }
    });

    socket.on("error", (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  return io;
};

// 🔁 Accessor to get `io` instance anywhere else in the app
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
