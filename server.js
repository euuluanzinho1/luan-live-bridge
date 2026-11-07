import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import {
  TikTokLiveConnection,
  WebcastEvent
} from "tiktok-live-connector";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const USERNAME = "luansongs";

let connection = null;
let connecting = false;

app.get("/", (req, res) => {
  res.send("LUAN LIVE STUDIO - Ponte ativa");
});

function enviar(evento) {
  const mensagem = JSON.stringify(evento);

  wss.clients.forEach((cliente) => {
    if (cliente.readyState === 1) {
      cliente.send(mensagem);
    }
  });
}

async function conectarTikTok() {
  if (connection || connecting) return;

  connecting = true;
  connection = new TikTokLiveConnection(USERNAME);

  connection.on(WebcastEvent.CHAT, (data) => {
    enviar({
      event: "chat",
      user: data.user?.nickname || data.user?.uniqueId || "Usuário",
      comment: data.comment || ""
    });
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    enviar({
      event: "gift",
      user: data.user?.nickname || "Usuário",
      giftName: data.extendedGiftInfo?.name || "Presente",
      repeatCount: data.repeatCount || 1
    });
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    enviar({
      event: "like",
      user: data.user?.nickname || "Usuário",
      likeCount: data.likeCount || 1
    });
  });

  connection.on(WebcastEvent.SOCIAL, (data) => {
    enviar({
      event: "follow",
      user: data.user?.nickname || "Usuário"
    });
  });

  connection.on("error", (erro) => {
    console.log("Erro TikTok:", erro.message);
  });

  try {
    await connection.connect();
    enviar({ event: "status", message: "TikTok LIVE conectado!" });
    console.log("Conectado ao TikTok LIVE de @" + USERNAME);
  } catch (erro) {
    console.log("Não foi possível conectar:", erro.message);
    connection = null;
  } finally {
    connecting = false;
  }
}

wss.on("connection", (socket) => {
  socket.on("message", (mensagem) => {
    try {
      const dados = JSON.parse(mensagem);

      if (dados.action === "subscribe") {
        conectarTikTok();
      }
    } catch {
      console.log("Mensagem inválida");
    }
  });
});

server.listen(PORT, () => {
  console.log("LUAN LIVE STUDIO ativo na porta " + PORT);
});
