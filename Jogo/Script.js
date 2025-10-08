const canvas = document.getElementById('maze');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

const colatablesQuant = 11;
const tileSize = 50;

//
// ---------- GERADOR DE LABIRINTO (Divisão Recursiva robusta) ----------
let maze = [];   // será preenchido dinamicamente
let goal = null; // posição da bandeira (goal)
const mazeWidth = 10;  // manter 10 para se adaptar ao seu canvas 500x500 com tileSize=50
const mazeHeight = 10;

// Gera um labirinto com paredes (1) e caminhos (0)
function generateMaze(width = mazeWidth, height = mazeHeight) {
  // inicia todo com paredes
  const grid = Array.from({ length: height }, () => Array(width).fill(1));

  // abre o interior como caminho (0)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = 0;
    }
  }

  // função recursiva que insere paredes completas com um furo/passa (passage)
  function divide(xStart, yStart, xEnd, yEnd) {
    const w = xEnd - xStart + 1;
    const h = yEnd - yStart + 1;

    // área muito pequena para dividir
    if (w < 2 || h < 2) return;

    // escolhe orientação (prefere dividir a maior dimensão)
    let horizontal = (w < h) ? true : (h < w ? false : Math.random() < 0.5);

    if (horizontal) {
      // escolhe uma linha de parede (entre yStart+1 .. yEnd-1)
      if (yEnd - yStart < 2) return;
      const wallY = Math.floor(Math.random() * (yEnd - yStart - 1)) + yStart + 1;
      // escolhe uma passagem (qualquer x dentro do intervalo)
      const passageX = Math.floor(Math.random() * (xEnd - xStart + 1)) + xStart;

      // desenha parede horizontal (com uma passagem)
      for (let x = xStart; x <= xEnd; x++) grid[wallY][x] = 1;
      grid[wallY][passageX] = 0;

      // recursão nas duas metades
      divide(xStart, yStart, xEnd, wallY - 1);
      divide(xStart, wallY + 1, xEnd, yEnd);
    } else {
      // vertical
      if (xEnd - xStart < 2) return;
      const wallX = Math.floor(Math.random() * (xEnd - xStart - 1)) + xStart + 1;
      const passageY = Math.floor(Math.random() * (yEnd - yStart + 1)) + yStart;

      for (let y = yStart; y <= yEnd; y++) grid[y][wallX] = 1;
      grid[passageY][wallX] = 0;

      divide(xStart, yStart, wallX - 1, yEnd);
      divide(wallX + 1, yStart, xEnd, yEnd);
    }
  }

  divide(1, 1, width - 2, height - 2);
  return grid;
}

// retorna uma célula livre aleatória (0)
function getRandomFreeCell() {
  const free = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[0].length; x++) {
      if (maze[y][x] === 0) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 1, y: 1 };
  return free[Math.floor(Math.random() * free.length)];
}

// inicializa maze, player, collectibles e goal (bandeira)
function initializeProceduralMaze() {
  // gera labirinto
  maze = generateMaze(mazeWidth, mazeHeight);

  // coloca o player em célula livre aleatória
  player = getRandomFreeCell();

  // gera coletáveis evitando o player (usa sua função existente)
  collectibles = generateCollectibles(colatablesQuant);

  // gera goal (bandeira) em célula livre que NÃO seja player nem coletável
  let candidate;
  const occupied = (x, y) =>
    (x === player.x && y === player.y) || collectibles.some(c => c.x === x && c.y === y);

  do {
    candidate = getRandomFreeCell();
  } while (occupied(candidate.x, candidate.y));

  goal = { x: candidate.x, y: candidate.y };

  // desenha/update inicial
  drawMaze();
  loadRecords(); // mantém seu fetch de recordes
}

//
// Adicionando sprite moeda
const coinImage = new Image();
coinImage.src = "assets/coin.png";
let pulseTime = 0; // responsavel pela animacao da moeda

// Adicionando sprite Bandeira
const flagImage = new Image();
flagImage.src = "assets/flag.png";

// Adicionando sprite Player
const playerImage = new Image();
playerImage.src = "assets/player.gif";

function update() {
  pulseTime += 0.05; // controla a velocidade da pulsação
  drawMaze();
  drawPlayer(ctx); // anima o personagem
  requestAnimationFrame(update);
}

// --- CONFIGURAÇÃO DO PLAYER ---
const playerFrames = [];
const totalFrames = 8;
let currentFrame = 0;
let frameDelay = 0;
const animationSpeed = 8; // menor = mais rápido

let isMoving = false; // 🚀 controla se o jogador está se movendo

// --- CARREGA AS IMAGENS ---
for (let i = 1; i <= totalFrames; i++) {
  const img = new Image();
  img.src = `assets/player/frame_${i}.gif`;
  playerFrames.push(img);
}



// --- DESENHA O PLAYER ---
let facingLeft = false; // controla a direção atual

function drawPlayer(ctx) {
  const img = playerFrames[currentFrame] || playerFrames[0];

  if (!img.complete) return;

  const posX = player.x * tileSize;
  const posY = player.y * tileSize;
  const w = tileSize;
  const h = tileSize;

  ctx.save(); // salva o estado atual do canvas

  if (facingLeft) {
    // Espelha horizontalmente em torno do centro do jogador
    ctx.translate(posX + w / 2, posY + h / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    // Direção normal (para a direita)
    ctx.drawImage(img, posX, posY, w, h);
  }

  ctx.restore(); // restaura o estado original

  // Atualiza frame da animação somente se estiver se movendo
  if (isMoving) {
    frameDelay++;
    if (frameDelay >= animationSpeed) {
      frameDelay = 0;
      currentFrame = (currentFrame + 1) % totalFrames;
    }
  } else {
    currentFrame = 0;
  }
}


// Garantindo o carregamento do sprite coin
coinImage.onload = () => {
  update();
};

// Garantindo o carregamento do sprite Flag
flagImage.onload = () => {
  drawMaze();
};




// Jogador e meta
let player = { x: 1, y: 1 };

let score = 0;

// Coletáveis (moedas)
function generateCollectibles(count) {
  if (!maze || !Array.isArray(maze) || maze.length === 0 || !Array.isArray(maze[0])) {
    console.warn("⚠️ generateCollectibles chamado antes do labirinto existir. Abortando geração de coletáveis.");
    return [];
  }

  const items = [];
  while (items.length < count) {
    const x = Math.floor(Math.random() * maze[0].length);
    const y = Math.floor(Math.random() * maze.length);

    if (maze[y][x] === 0 && !(x === player.x && y === player.y)) {
      items.push({ x, y });
    }
  }
  return items;
}

let collectibles = generateCollectibles(colatablesQuant); // gera 8 moedas aleatórias


// Função para desenhar o labirinto
function drawMaze() {
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      ctx.fillStyle = maze[y][x] === 1 ? "#000" : "#333";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }


  // Meta (Bandeira)
  // Meta (Bandeira)
  if (flagImage.complete && goal) {
    const size = 60; // tamanho do sprite
    ctx.drawImage(
      flagImage,
      goal.x * tileSize + (tileSize - size) / 2,
      goal.y * tileSize + (tileSize - size) / 2,
      size,
      size
    );
  }



  // Coletáveis (sprites pulsantes)
  collectibles.forEach(c => {
    const baseSize = 30; // tamanho base da moeda
    const pulse = 1 + 0.1 * Math.sin(pulseTime + (c.x + c.y));
    const size = baseSize * pulse;

    const drawX = c.x * tileSize + (tileSize - size) / 2;
    const drawY = c.y * tileSize + (tileSize - size) / 2;

    ctx.drawImage(coinImage, drawX, drawY, size, size);
  });


  /*// Jogador animado (GIF)
  const size = 40; // tamanho do sprite
  if (playerImage.complete) {
    ctx.drawImage(
      playerImage,
      player.x * tileSize + (tileSize - size) / 2,
      player.y * tileSize + (tileSize - size) / 2,
      size,
      size
    );
  } else {
    // fallback (caso o GIF ainda não tenha carregado)
    ctx.fillStyle = "#00f";
    ctx.fillRect(player.x * tileSize + 10, player.y * tileSize + 10, tileSize - 20, tileSize - 20);
  }*/

}

function movePlayer(dx, dy) {
  if (isMoving) return;
  const newX = player.x + dx;
  const newY = player.y + dy;
  const oldX = player.x;
  const oldY = player.y;

  // Verifica colisão com paredes
  if (maze[newY][newX] === 0) {
    player.x = newX;
    player.y = newY;
  }

  // Se o jogador realmente se moveu, ativa a animação
  if (player.x !== oldX || player.y !== oldY) {
    isMoving = true;
    setTimeout(() => {
      isMoving = false;
    }, 300); // 🔁 tempo de movimento (ajuste conforme o jogo)
  }
  checkCollectible();
  checkWin();
  drawMaze();
}

function checkCollectible() {
  for (let i = 0; i < collectibles.length; i++) {
    const c = collectibles[i];
    if (player.x === c.x && player.y === c.y) {
      collectibles.splice(i, 1);
      score += 10;
      scoreDisplay.textContent = score;
      break;
    }
  }
}

function checkWin() {
  if (player.x === goal.x && player.y === goal.y) {
    setTimeout(() => {
      alert(`🎉 Parabéns! Você venceu com ${score} pontos!`);
      resetGame();
    }, 100);
  }
}

function resetGame() {
  player = { x: 1, y: 1 };
  score = 0;
  collectibles = [
    { x: 2, y: 1 },
    { x: 4, y: 3 },
    { x: 7, y: 5 },
    { x: 2, y: 7 },
    { x: 8, y: 2 }
  ];
  scoreDisplay.textContent = score;
  drawMaze();
}

// Controles
document.addEventListener("keydown", (e) => {
  // Ignora se o foco estiver em um input ou textarea
  const active = document.activeElement;
  const typing =
    active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

  if (typing) return; // se estiver digitando, sai da função

  // === Movimento normal do jogador ===
  if (e.key === "ArrowUp" || e.key === "w") movePlayer(0, -1);
  if (e.key === "ArrowDown" || e.key === "s") movePlayer(0, 1);
  if (e.key === "ArrowLeft" || e.key === "a") {
    movePlayer(-1, 0);
    facingLeft = true;
  }
  if (e.key === "ArrowRight" || e.key === "d") {
    movePlayer(1, 0);
    facingLeft = false;
  }
});


const apiURL = "http://localhost:3000";

function checkWin() {
  if (player.x === goal.x && player.y === goal.y) {
    setTimeout(() => {
      const playerName = document.getElementById('playerName').value || "Anônimo";
      alert(`🎉 Parabéns ${playerName}! Você venceu com ${score} pontos!`);
      saveScore(playerName, score);
      resetGame();
    }, 100);
  }
}

async function saveScore(name, playerScore) {
  const input = document.getElementById('playerName');
  if (!input) {
    console.error('Input #playerName não encontrado. Verifique o id no HTML.');
    alert('Erro: campo de nome não encontrado.');
    return;
  }

  if (!name) {
    alert('Digite seu nome antes de salvar a pontuação.');
    input.focus();
    return;
  }

  const payload = { name, score: playerScore };
  console.log('Enviando payload para /save-score ->', payload);

  try {
    const res = await fetch('http://localhost:3000/save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Resposta do servidor:', data);
    if (data.success) {
      alert(data.message || 'Pontuação salva/atualizada com sucesso!');
    } else {
      alert(data.message || 'Não foi possível salvar a pontuação.');
    }
  } catch (err) {
    console.error('Erro ao enviar pontuação:', err);
    alert('Erro ao conectar ao servidor.');
  }
}



async function loadRecords() {
  try {
    const res = await fetch(`${apiURL}/records`);
    const records = await res.json();
    const list = document.getElementById('recordList');
    list.innerHTML = "";
    records.forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.player_name} — ${r.score} pts`;
      list.appendChild(li);
    });
  } catch (error) {
    console.error("Erro ao carregar recordes:", error);
  }
}

// Inicializa
// em vez de drawMaze(); loadRecords();
startGameSafely();

// Inicialização segura do jogo — garante que o labirinto exista antes de gerar qualquer coisa
async function startGameSafely() {
  console.log("🔄 Iniciando geração do labirinto...");

  // Gera o labirinto primeiro
  maze = generateMaze(mazeWidth, mazeHeight);

  // Garante que o labirinto foi realmente criado
  if (!maze || !maze.length || !maze[0].length) {
    console.error("❌ Falha ao gerar labirinto. Abortando inicialização.");
    return;
  }

  console.log("✅ Labirinto gerado com sucesso:", mazeWidth, "x", mazeHeight);

  // Agora podemos gerar o jogador
  player = getRandomFreeCell();

  // Gera os coletáveis
  collectibles = generateCollectibles(colatablesQuant);

  // Gera a bandeira (goal)
  let candidate;
  const occupied = (x, y) =>
    (x === player.x && y === player.y) || collectibles.some(c => c.x === x && c.y === y);

  do {
    candidate = getRandomFreeCell();
  } while (occupied(candidate.x, candidate.y));

  goal = { x: candidate.x, y: candidate.y };

  // Agora sim desenhamos tudo
  drawMaze();

  // Inicia o loop de atualização
  update();

  // E finalmente carrega os recordes
  loadRecords();

  console.log("🏁 Inicialização completa.");
}



// === SUBMENU DE PROGRESSO ===

// Botões e elementos
const submenu = document.getElementById("submenu");
const openMenuBtn = document.getElementById("openMenu");
const closeMenuBtn = document.getElementById("closeMenu");
const loadProgressBtn = document.getElementById("loadProgress");
const playerNameInput = document.getElementById("playerNameCheck");
const goalNodes = document.querySelectorAll(".goal");

openMenuBtn.addEventListener("click", () => {
  submenu.classList.remove("hidden");
});

closeMenuBtn.addEventListener("click", () => {
  submenu.classList.add("hidden");
});

// Função para atualizar as esferas conforme a pontuação
function updateGoals(points) {
  goalNodes.forEach(goal => {
    const goalValue = parseInt(goal.dataset.points);
    if (points >= goalValue) {
      goal.classList.add("completed");
    } else {
      goal.classList.remove("completed");
    }
  });
}

// Consulta no banco via API
loadProgressBtn.addEventListener("click", async () => {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert("Digite seu nome para consultar o progresso!");
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/score?name=${encodeURIComponent(name)}`);
    const data = await res.json();

    if (data.success) {
      updateGoals(data.score);
    } else {
      alert("Jogador não encontrado!");
      updateGoals(0);
    }
  } catch (err) {
    console.error("Erro ao buscar dados:", err);
    alert("Erro ao conectar ao servidor.");
  }
});
