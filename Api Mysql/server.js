const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "rootpass123", // coloque sua senha do MySQL aqui
  database: "app_db",
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error("Erro ao conectar ao banco:", err);
  } else {
    console.log("✅ Conectado ao MySQL!");
  }
});

// Rota para salvar pontuação
app.post("/save-score", (req, res) => {
  const { player_name, score } = req.body;

  if (!player_name || score === undefined) {
    return res.status(400).json({ success: false, message: "Dados inválidos." });
  }

  // Verifica se o jogador já existe
  const checkQuery = "SELECT score FROM scores WHERE player_name = ?";

  db.query(checkQuery, [player_name], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro no servidor" });
    }

    // Se o jogador existe
    if (results.length > 0) {
      const oldScore = results[0].score;

      // Se o novo score é maior, atualiza
      if (score > oldScore) {
        const updateQuery = "UPDATE scores SET score = ? WHERE player_name = ?";
        db.query(updateQuery, [score, player_name], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erro ao atualizar pontuação" });
          }
          return res.json({ success: true, updated: true, message: "Recorde atualizado!" });
        });
      } else {
        // Se não for maior, mantém o recorde anterior
        return res.json({ success: true, updated: false, message: "Pontuação menor que o recorde anterior" });
      }
    } else {
      // Novo jogador — insere no banco
      const insertQuery = "INSERT INTO scores (player_name, score) VALUES (?, ?)";
      db.query(insertQuery, [player_name, score], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Erro ao salvar novo jogador" });
        }
        return res.json({ success: true, created: true, message: "Novo jogador cadastrado!" });
      });
    }
  });
});


// Rota para listar os melhores recordes
app.get("/records", (req, res) => {
  const sql = "SELECT player_name, score FROM scores ORDER BY score DESC LIMIT 5";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar recordes:", err);
      return res.status(500).json({ message: "Erro ao buscar recordes" });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

// GET - Consultar pontuação de um jogador
app.get("/score", (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ success: false, message: "Nome obrigatório" });

  const query = "SELECT score FROM scores WHERE player_name = ?";
  db.query(query, [name], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro no servidor" });
    }

    if (results.length > 0) {
      res.json({ success: true, score: results[0].score });
    } else {
      res.json({ success: false, message: "Jogador não encontrado" });
    }
  });
});