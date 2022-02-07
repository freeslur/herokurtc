import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const handleListen = () => console.log(`Listening on ${PORT}`);

app
  .use('/public', express.static(__dirname + '/public'))
  .set('view engine', 'pug')
  .set('views', __dirname + '/views')
  .get('/', (_, res) => res.render('home'))
  .get('/*', (_, res) => res.redirect('/'));
// .listen(PORT, () => console.log(`Listening on ${PORT}`));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

wsServer.on('connection', (socket) => {
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit('welcome');
  });
  socket.on('offer', (offer, roomName) => {
    socket.to(roomName).emit('offer', offer);
  });
  socket.on('answer', (answer, roomName) => {
    socket.to(roomName).emit('answer', answer);
  });
  socket.on('ice', (ice, roomName) => {
    socket.to(roomName).emit('ice', ice);
  });
});

httpServer.listen(PORT, handleListen);
