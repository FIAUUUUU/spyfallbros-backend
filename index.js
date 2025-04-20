const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const salas = {};

io.on("connection", (socket) => {
  console.log("🛰️ Nuevo jugador conectado:", socket.id);

  socket.on("crear_sala", (callback) => {
    const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
    salas[codigo] = {
      anfitrion: socket.id,
      jugadores: [{ id: socket.id, nombre: "Anfitrión" }],
      iniciada: false
    };
    socket.join(codigo);
    callback({ codigo });
  });

  socket.on("unirse_sala", ({ codigo, nombre }, callback) => {
    const sala = salas[codigo];
    if (sala && !sala.iniciada) {
      sala.jugadores.push({ id: socket.id, nombre });
      socket.join(codigo);
      callback({ exito: true });
      io.to(codigo).emit("jugadores_actualizados", sala.jugadores);
    } else {
      callback({ exito: false, mensaje: "Sala no válida o ya iniciada" });
    }
  });

  socket.on("iniciar_juego", (codigo) => {
    const sala = salas[codigo];
    if (!sala || sala.jugadores.length < 3 || sala.iniciada) return;

    sala.iniciada = true;
    const espiaIndex = Math.floor(Math.random() * sala.jugadores.length);
    const ubicacion = "Estación Espacial"; // luego puede hacerse aleatorio
    const roles = ["Comandante", "Ingeniero", "Médico", "Turista"];

    sala.jugadores.forEach((jugador, i) => {
      const datos = i === espiaIndex
        ? { rol: "Espía" }
        : { rol: roles[i % roles.length], ubicacion };
      io.to(jugador.id).emit("rol_asignado", datos);
    });
  });

  socket.on("finalizar_juego", (codigo) => {
    const sala = salas[codigo];
    if (sala && sala.anfitrion === socket.id) {
      io.to(codigo).emit("juego_finalizado");
      delete salas[codigo];
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Jugador desconectado:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("✅ Servidor activo en http://localhost:3001");
});
