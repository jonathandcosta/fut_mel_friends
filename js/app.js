// js/app.js

// Variáveis Globais
let listaJogadoresLocal = [];
let rosterBase = [];
let placarAtual = {
  az_am: { a: 0, b: 0 },
  az_vd: { a: 0, b: 0 },
  vd_am: { a: 0, b: 0 },
};
let jogoAtualID = "";
let ladoAtual = "";
let timeGoleadorAtual = "";

// Elementos do DOM
const listaContainer = document.getElementById("lista-jogadores");
const inputData = document.getElementById("data-partida");
const statusJogo = document.getElementById("status-jogo");

// --- INICIALIZAÇÃO ---
function definirProximoSabado() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const diasParaSabado = (6 - diaSemana + 7) % 7;
  const proximoSabado = new Date(hoje);
  proximoSabado.setDate(hoje.getDate() + diasParaSabado);
  inputData.value = proximoSabado.toISOString().split("T")[0];
}

function navegarData(dias) {
  const dataAtual = new Date(inputData.value);
  dataAtual.setDate(dataAtual.getDate() + dias);
  inputData.value = dataAtual.toISOString().split("T")[0];
  carregarDadosDaPartida();
}

async function iniciarSistema() {
  definirProximoSabado();
  // O 'db' vem do config.js (window.db)
  if (!window.db) {
    console.error("Erro: Banco de dados não carregado. Verifique o config.js");
    return;
  }

  window.db
    .collection("jogadores")
    .orderBy("nome")
    .onSnapshot((snapshot) => {
      rosterBase = [];
      snapshot.forEach((doc) => {
        rosterBase.push({ id: doc.id, ...doc.data() });
      });
      carregarDadosDaPartida();
    });
}

// --- GERENCIAMENTO DE DADOS ---
function sincronizarComCadastro(listaCarregada) {
  const listaAtualizada = [];
  rosterBase.forEach((jogadorBase) => {
    const jogadorExistente = listaCarregada.find(
      (j) => j.id === jogadorBase.id
    );
    if (jogadorExistente) {
      jogadorExistente.nome = jogadorBase.nome;
      jogadorExistente.tipo = jogadorBase.tipo;
      if (!jogadorExistente.times) jogadorExistente.times = [];
      listaAtualizada.push(jogadorExistente);
    } else {
      listaAtualizada.push(criarObjetoJogador(jogadorBase));
    }
  });
  return listaAtualizada;
}

function criarObjetoJogador(base) {
  return {
    id: base.id,
    nome: base.nome,
    tipo: base.tipo,
    presente: false,
    gols: 0,
    assist: 0,
    bolaCheia: false,
    bolaMurcha: false,
    times: [],
  };
}

async function carregarDadosDaPartida() {
  const dataSelecionada = inputData.value;
  listaContainer.innerHTML =
    '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i></div>';

  let dadosParaRenderizar = [];
  const rascunho = localStorage.getItem(`pelada_${dataSelecionada}`);
  const rascunhoPlacar = localStorage.getItem(`placar_${dataSelecionada}`);

  if (rascunho) {
    dadosParaRenderizar = JSON.parse(rascunho);
    placarAtual = rascunhoPlacar ? JSON.parse(rascunhoPlacar) : resetPlacar();
    statusJogo.innerText = "⚠️ RASCUNHO LOCAL";
  } else {
    try {
      const docRef = window.db.collection("partidas").doc(dataSelecionada);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        dadosParaRenderizar = docSnap.data().jogadores;
        placarAtual = docSnap.data().placar || resetPlacar();
        statusJogo.innerText = "✅ DADOS DO BANCO";
      } else {
        dadosParaRenderizar = [];
        placarAtual = resetPlacar();
        statusJogo.innerText = "✨ NOVA PARTIDA";
      }
    } catch (error) {
      console.error(error);
    }
  }
  listaJogadoresLocal = sincronizarComCadastro(dadosParaRenderizar);
  renderizarLista();
  renderizarPlacar();
}

function resetPlacar() {
  return {
    az_am: { a: 0, b: 0 },
    az_vd: { a: 0, b: 0 },
    vd_am: { a: 0, b: 0 },
  };
}

function salvarRascunhoLocal() {
  const dataSelecionada = inputData.value;
  localStorage.setItem(
    `pelada_${dataSelecionada}`,
    JSON.stringify(listaJogadoresLocal)
  );
  localStorage.setItem(
    `placar_${dataSelecionada}`,
    JSON.stringify(placarAtual)
  );
  statusJogo.innerText = "SALVANDO...";
}

// Tornar global para ser chamado pelo HTML
window.salvarDadosPartida = function () {
  const dataSelecionada = inputData.value;
  window.db
    .collection("partidas")
    .doc(dataSelecionada)
    .set({
      data: dataSelecionada,
      local: "Campo da SAMU",
      jogadores: listaJogadoresLocal,
      placar: placarAtual,
      ultimaAtualizacao: new Date(),
    })
    .then(() => {
      localStorage.removeItem(`pelada_${dataSelecionada}`);
      localStorage.removeItem(`placar_${dataSelecionada}`);
      statusJogo.innerText = "✅ SALVO NO BANCO";
      mostrarToast("Dados salvos com sucesso!");
    });
};

function mostrarToast(msg) {
  const t = document.getElementById("toast");
  t.querySelector("span").innerText = msg || "Feito!";
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2000);
}

// --- LÓGICA DO PLACAR ---
function renderizarPlacar() {
  document.getElementById("score-az-am-a").innerText = placarAtual.az_am.a;
  document.getElementById("score-az-am-b").innerText = placarAtual.az_am.b;
  document.getElementById("score-az-vd-a").innerText = placarAtual.az_vd.a;
  document.getElementById("score-az-vd-b").innerText = placarAtual.az_vd.b;
  document.getElementById("score-vd-am-a").innerText = placarAtual.vd_am.a;
  document.getElementById("score-vd-am-b").innerText = placarAtual.vd_am.b;
}

window.adicionarGolNoJogo = function (jogoID, lado, corTime) {
  jogoAtualID = jogoID;
  ladoAtual = lado;
  timeGoleadorAtual = corTime;

  document.getElementById("time-gol-label").innerText = corTime;
  let corClass = "text-blue-600";
  if (corTime === "amarelo") corClass = "text-yellow-500";
  if (corTime === "verde") corClass = "text-green-600";
  document.getElementById(
    "time-gol-label"
  ).className = `uppercase font-bold ${corClass}`;

  const container = document.getElementById("lista-possiveis-goleadores");
  container.innerHTML = "";

  const possiveis = listaJogadoresLocal.filter(
    (j) => j.presente && j.times.includes(corTime)
  );

  if (possiveis.length === 0) {
    const todos = listaJogadoresLocal.filter((j) => j.presente);
    if (todos.length === 0)
      container.innerHTML =
        '<p class="col-span-2 text-center text-xs text-gray-500">Marque presença primeiro.</p>';
    else todos.forEach((j) => criarBotaoGoleador(j, container));
  } else {
    possiveis.forEach((j) => criarBotaoGoleador(j, container));
  }
  document.getElementById("modal-goleador").classList.remove("hidden");
};

window.diminuirGolNoJogo = function (jogoID, lado) {
  if (placarAtual[jogoID][lado] > 0) {
    placarAtual[jogoID][lado]--;
    renderizarPlacar();
    salvarRascunhoLocal();
  }
};

function criarBotaoGoleador(jogador, container) {
  const btn = document.createElement("button");
  btn.className =
    "flex items-center gap-2 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-lg transition text-left group";
  btn.onclick = () => confirmarGol(jogador.id);
  btn.innerHTML = `
        <div class="w-8 h-8 bg-gray-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 group-hover:text-blue-600">
            ${jogador.nome.substring(0, 2).toUpperCase()}
        </div>
        <span class="text-sm font-bold text-gray-700 truncate">${
          jogador.nome
        }</span>
    `;
  container.appendChild(btn);
}

window.confirmarGol = function (idJogador) {
  const jogador = listaJogadoresLocal.find((j) => j.id === idJogador);
  if (jogador) {
    jogador.gols = (jogador.gols || 0) + 1;
    renderizarLista();
  }
  apenasIncrementarPlacar();
};

window.apenasIncrementarPlacar = function () {
  placarAtual[jogoAtualID][ladoAtual]++;
  renderizarPlacar();
  salvarRascunhoLocal();
  fecharModais();
};

window.fecharModais = function () {
  document.getElementById("modal-goleador").classList.add("hidden");
  document.getElementById("modal-cadastro").classList.add("hidden");
  document.getElementById("modal-editar").classList.add("hidden");
};

// --- GESTÃO DE ATLETAS ---
window.abrirEditar = function (id) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (!jogador) return;

  document.getElementById("edit-id").value = jogador.id;
  document.getElementById("edit-nome").value = jogador.nome;
  document.getElementById("edit-tipo").value = jogador.tipo;

  document.getElementById("modal-editar").classList.remove("hidden");
};

window.salvarEdicaoJogador = function () {
  const id = document.getElementById("edit-id").value;
  const novoNome = document.getElementById("edit-nome").value;
  const novoTipo = document.getElementById("edit-tipo").value;

  window.db
    .collection("jogadores")
    .doc(id)
    .update({
      nome: novoNome,
      tipo: novoTipo,
    })
    .then(() => {
      mostrarToast("Jogador Atualizado");
      fecharModais();
    });
};

window.excluirJogador = function () {
  const id = document.getElementById("edit-id").value;
  if (
    confirm(
      "Tem certeza que deseja EXCLUIR este jogador? Isso não pode ser desfeito."
    )
  ) {
    window.db
      .collection("jogadores")
      .doc(id)
      .delete()
      .then(() => {
        mostrarToast("Jogador Excluído");
        fecharModais();
      })
      .catch((err) => alert("Erro ao excluir: " + err));
  }
};

window.abrirModalCadastro = function () {
  document.getElementById("modal-cadastro").classList.remove("hidden");
};

window.confirmarCadastroCompleto = function () {
  const nome = document.getElementById("novo-nome").value;
  const tipo = document.getElementById("novo-tipo").value;
  const timeIni = document.getElementById("novo-time-ini").value;

  if (!nome) return alert("Nome obrigatório");

  const nomeFormatado = nome
    .toLowerCase()
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  if (rosterBase.some((j) => j.nome === nomeFormatado))
    return alert("Já existe!");

  window.db
    .collection("jogadores")
    .add({
      nome: nomeFormatado,
      tipo: tipo,
      dataCriacao: new Date(),
    })
    .then((docRef) => {
      const novo = criarObjetoJogador({
        id: docRef.id,
        nome: nomeFormatado,
        tipo: tipo,
      });
      novo.presente = true;
      if (timeIni) novo.times.push(timeIni);

      listaJogadoresLocal.push(novo);
      renderizarLista();
      salvarRascunhoLocal();
      fecharModais();
      document.getElementById("novo-nome").value = "";
    });
};

// --- RENDERIZAÇÃO DA LISTA ---
function renderizarLista() {
  listaContainer.innerHTML = "";
  const listaOrdenada = [...listaJogadoresLocal].sort(
    (a, b) => b.presente - a.presente || a.nome.localeCompare(b.nome)
  );

  listaOrdenada.forEach((jogador) => {
    const card = document.createElement("div");
    const bgClass = jogador.presente
      ? "bg-white border-l-4 border-primary shadow-sm"
      : "bg-white/50 opacity-60 border border-gray-200";

    const times = jogador.times || [];
    const btnAzul = times.includes("azul")
      ? "bg-blue-600 ring-2 ring-blue-300"
      : "bg-gray-200";
    const btnAmarelo = times.includes("amarelo")
      ? "bg-yellow-400 ring-2 ring-yellow-200"
      : "bg-gray-200";
    const btnVerde = times.includes("verde")
      ? "bg-green-600 ring-2 ring-green-300"
      : "bg-gray-200";

    card.className = `p-3 rounded-xl transition-all ${bgClass}`;

    card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gray-400 shadow-inner">
                        ${jogador.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 leading-tight">${
                          jogador.nome
                        }</p>
                        <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wide">${
                          jogador.tipo
                        }</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                     <button onclick="abrirEditar('${
                       jogador.id
                     }')" class="text-gray-300 hover:text-primary w-8 h-8 flex items-center justify-center transition">
                        <i class="fa-solid fa-pen-to-square"></i>
                     </button>
                     <div onclick="togglePresenca('${
                       jogador.id
                     }')" class="cursor-pointer w-6 h-6 border-2 rounded ${
      jogador.presente ? "bg-primary border-primary" : "border-gray-300"
    } flex items-center justify-center transition">
                        ${
                          jogador.presente
                            ? '<i class="fa-solid fa-check text-white text-xs"></i>'
                            : ""
                        }
                     </div>
                </div>
            </div>

            ${
              jogador.presente
                ? `
                <div class="mt-3 pt-2 border-t border-gray-100 animate-[fadeIn_0.3s]">
                    <div class="flex justify-center gap-3 mb-3">
                        <span class="text-[10px] font-bold text-gray-400 uppercase self-center">Times:</span>
                        <button onclick="toggleTime('${jogador.id}','azul')" class="w-6 h-6 rounded-full ${btnAzul} transition hover:scale-110 shadow-sm"></button>
                        <button onclick="toggleTime('${jogador.id}','amarelo')" class="w-6 h-6 rounded-full ${btnAmarelo} transition hover:scale-110 shadow-sm"></button>
                        <button onclick="toggleTime('${jogador.id}','verde')" class="w-6 h-6 rounded-full ${btnVerde} transition hover:scale-110 shadow-sm"></button>
                    </div>
                    <div class="flex gap-2">
                         <div class="flex-1 bg-gray-50 rounded p-1 flex items-center justify-between px-2 border border-gray-100">
                            <span class="text-[10px] font-bold text-gray-400">GOLS</span>
                            <input type="number" value="${jogador.gols}" onchange="updateStat('${jogador.id}', 'gols', this.value)" class="w-8 text-center bg-transparent font-bold outline-none text-gray-700">
                         </div>
                         <div class="flex-1 bg-gray-50 rounded p-1 flex items-center justify-between px-2 border border-gray-100">
                            <span class="text-[10px] font-bold text-gray-400">ASSIST</span>
                            <input type="number" value="${jogador.assist}" onchange="updateStat('${jogador.id}', 'assist', this.value)" class="w-8 text-center bg-transparent font-bold outline-none text-gray-700">
                         </div>
                    </div>
                </div>
            `
                : ""
            }
        `;
    listaContainer.appendChild(card);
  });
  document.getElementById("contador-presenca").innerText = listaOrdenada.filter(
    (j) => j.presente
  ).length;
}

// Funções globais auxiliares
window.togglePresenca = function (id) {
  const j = listaJogadoresLocal.find((x) => x.id === id);
  if (j) {
    j.presente = !j.presente;
    renderizarLista();
    salvarRascunhoLocal();
  }
};
window.toggleTime = function (id, cor) {
  const j = listaJogadoresLocal.find((x) => x.id === id);
  if (j) {
    if (!j.times) j.times = [];
    j.times.includes(cor)
      ? (j.times = j.times.filter((t) => t !== cor))
      : j.times.push(cor);
    renderizarLista();
    salvarRascunhoLocal();
  }
};
window.updateStat = function (id, campo, val) {
  const j = listaJogadoresLocal.find((x) => x.id === id);
  if (j) {
    j[campo] = parseInt(val) || 0;
    salvarRascunhoLocal();
  }
};

// Inicializa
iniciarSistema();
