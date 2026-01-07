// === VARIÁVEIS GLOBAIS ===
let listaJogadoresLocal = [];
let rosterBase = [];

const listaContainer = document.getElementById("lista-jogadores");
const contadorPresenca = document.getElementById("contador-presenca");
const inputData = document.getElementById("data-partida");
const statusJogo = document.getElementById("status-jogo");

// === 1. INICIALIZAÇÃO ===
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
  carregarDadosDaPartida(); // Força recarregar ao clicar nas setinhas
}

async function iniciarSistema() {
  definirProximoSabado();

  // Carrega o Cadastro Geral e chama a partida
  db.collection("jogadores")
    .orderBy("nome")
    .onSnapshot((snapshot) => {
      rosterBase = [];
      snapshot.forEach((doc) => {
        rosterBase.push({ id: doc.id, ...doc.data() });
      });
      carregarDadosDaPartida();
    });
}

// === 2. LÓGICA CENTRAL: CARREGAR E SINCRONIZAR ===

// Função que garante que ninguém fique de fora
function sincronizarComCadastro(listaCarregada) {
  const listaAtualizada = [];

  rosterBase.forEach((jogadorBase) => {
    // Procura se o jogador já tem dados na lista carregada (do banco ou rascunho)
    const jogadorExistente = listaCarregada.find(
      (j) => j.id === jogadorBase.id
    );

    if (jogadorExistente) {
      // Mantém os dados (gols, presença), mas atualiza nome/tipo do cadastro
      jogadorExistente.nome = jogadorBase.nome;
      jogadorExistente.tipo = jogadorBase.tipo;
      listaAtualizada.push(jogadorExistente);
    } else {
      // Se não tem dados (jogador novo ou lista vazia), cria zerado
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
  };
}

async function carregarDadosDaPartida() {
  const dataSelecionada = inputData.value;
  listaContainer.innerHTML =
    '<p class="text-center text-gray-400 py-4">Buscando...</p>';

  let dadosParaRenderizar = [];
  let fonte = "novo";

  // 1. Verifica Rascunho Local
  const rascunho = localStorage.getItem(`pelada_${dataSelecionada}`);

  if (rascunho) {
    dadosParaRenderizar = JSON.parse(rascunho);
    fonte = "rascunho";
    statusJogo.innerHTML = "⚠️ Rascunho não salvo";
    statusJogo.className =
      "text-center text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2 block";
  } else {
    // 2. Verifica Banco de Dados
    try {
      const docRef = db.collection("partidas").doc(dataSelecionada);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        dadosParaRenderizar = docSnap.data().jogadores;
        fonte = "banco";
        statusJogo.innerHTML = "✅ Jogo Salvo no Banco";
        statusJogo.className =
          "text-center text-xs font-bold uppercase tracking-widest text-green-600 mb-2 block";
      } else {
        // Se não tem rascunho e não tem banco, é lista nova (vazia)
        dadosParaRenderizar = [];
        fonte = "novo";
        statusJogo.innerHTML = "✨ Nova Partida";
        statusJogo.className =
          "text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block";
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  // 3. O PULO DO GATO: Sincroniza sempre
  // Se dadosParaRenderizar vier vazio (novo jogo), o sync preenche com todo mundo zerado.
  // Se vier com dados (banco/rascunho), o sync mantem os gols e adiciona novos jogadores.
  listaJogadoresLocal = sincronizarComCadastro(dadosParaRenderizar);

  renderizarLista();
}

function salvarRascunhoLocal() {
  const dataSelecionada = inputData.value;
  localStorage.setItem(
    `pelada_${dataSelecionada}`,
    JSON.stringify(listaJogadoresLocal)
  );
  statusJogo.innerHTML = "⚠️ Editando... (Não salvo)";
  statusJogo.className =
    "text-center text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2 block";
}

function salvarDadosPartida() {
  const dataSelecionada = inputData.value;

  db.collection("partidas")
    .doc(dataSelecionada)
    .set({
      data: dataSelecionada,
      local: "Campo da SAMU",
      jogadores: listaJogadoresLocal,
      ultimaAtualizacao: new Date(),
    })
    .then(() => {
      // Limpa o rascunho local
      localStorage.removeItem(`pelada_${dataSelecionada}`);

      // Atualiza status visual
      statusJogo.innerHTML = "✅ Jogo Salvo no Banco";
      statusJogo.className =
        "text-center text-xs font-bold uppercase tracking-widest text-green-600 mb-2 block";

      // Toast
      const toast = document.getElementById("toast-feedback");
      toast.classList.remove("hidden");
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 3000);
    })
    .catch((error) => {
      alert("Erro ao salvar! Verifique a internet.");
      console.error(error);
    });
}

// === 3. AÇÕES DA LISTA ===
function togglePresenca(id) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (jogador) {
    jogador.presente = !jogador.presente;
    renderizarLista();
    salvarRascunhoLocal();
  }
}

function updateStat(id, campo, valor) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (jogador) {
    jogador[campo] = parseInt(valor) || 0;
    salvarRascunhoLocal();
  }
}

function toggleDestaque(id, tipo) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (jogador) {
    if (tipo === "bolaCheia") {
      jogador.bolaCheia = !jogador.bolaCheia;
      if (jogador.bolaCheia) jogador.bolaMurcha = false;
    } else {
      jogador.bolaMurcha = !jogador.bolaMurcha;
      if (jogador.bolaMurcha) jogador.bolaCheia = false;
    }
    renderizarLista();
    salvarRascunhoLocal();
  }
}

// === 4. CADASTRO E EDIÇÃO ===
function abrirModalCadastro() {
  document.getElementById("modal-cadastro").classList.remove("hidden");
}

function fecharModais() {
  document.getElementById("modal-cadastro").classList.add("hidden");
  document.getElementById("modal-editar").classList.add("hidden");
}

function confirmarCadastro() {
  const nome = document.getElementById("input-nome-novo").value;
  const tipo = document.querySelector('input[name="tipo-novo"]:checked').value;

  if (!nome) return alert("Digite o nome");
  const nomeFormatado = nome
    .toLowerCase()
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  if (rosterBase.some((j) => j.nome === nomeFormatado))
    return alert("Já existe!");

  db.collection("jogadores")
    .add({
      nome: nomeFormatado,
      tipo: tipo,
      dataCriacao: new Date(),
    })
    .then(() => {
      fecharModais();
      document.getElementById("input-nome-novo").value = "";
    });
}

function abrirEditar(id) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (!jogador) return;

  document.getElementById("edit-id").value = jogador.id;
  document.getElementById("edit-nome").value = jogador.nome;

  const radios = document.getElementsByName("edit-tipo");
  for (const radio of radios) {
    radio.checked = radio.value === jogador.tipo;
  }
  document.getElementById("modal-editar").classList.remove("hidden");
}

function salvarEdicaoJogador() {
  const id = document.getElementById("edit-id").value;
  const novoNome = document.getElementById("edit-nome").value;
  const novoTipo = document.querySelector(
    'input[name="edit-tipo"]:checked'
  ).value;

  db.collection("jogadores")
    .doc(id)
    .update({
      nome: novoNome,
      tipo: novoTipo,
    })
    .then(() => {
      fecharModais();
    });
}

// === 5. RENDERIZAÇÃO ===
function atualizarContador() {
  const total = listaJogadoresLocal.filter((j) => j.presente).length;
  contadorPresenca.innerText = `${total} / ${listaJogadoresLocal.length}`;
}

function renderizarLista() {
  listaContainer.innerHTML = "";

  const listaOrdenada = [...listaJogadoresLocal].sort((a, b) => {
    if (a.presente !== b.presente) return b.presente - a.presente;
    if (a.tipo === "mensalista" && b.tipo !== "mensalista") return -1;
    if (a.tipo !== "mensalista" && b.tipo === "mensalista") return 1;
    return 0;
  });

  listaOrdenada.forEach((jogador) => {
    const card = document.createElement("div");
    let borda = jogador.presente
      ? "border-l-4 border-l-blue-500"
      : "opacity-75";
    let destaque = "";
    if (jogador.bolaCheia) destaque = "ring-2 ring-yellow-400";
    if (jogador.bolaMurcha) destaque = "ring-2 ring-gray-400";

    card.className = `bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-all ${borda} ${destaque}`;

    card.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 ${
                          jogador.tipo === "mensalista"
                            ? "bg-green-500"
                            : "bg-orange-400"
                        } rounded-full flex items-center justify-center text-white font-bold text-sm">
                            ${jogador.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="font-bold text-gray-800 capitalize">${
                                  jogador.nome
                                }</p>
                                <button onclick="abrirEditar('${
                                  jogador.id
                                }')" class="text-gray-300 hover:text-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                            </div>
                            <span class="text-[10px] ${
                              jogador.tipo === "mensalista"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            } px-2 py-0.5 rounded uppercase font-black">
                                ${jogador.tipo}
                            </span>
                        </div>
                    </div>
                    <input type="checkbox" ${jogador.presente ? "checked" : ""} 
                        onclick="togglePresenca('${jogador.id}')"
                        class="w-6 h-6 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer">
                </div>

                ${
                  jogador.presente
                    ? `
                    <div class="animate-[fadeIn_0.3s_ease-in]">
                        <div class="flex gap-4 mt-2 pt-2 border-t border-gray-50 mb-3">
                            <div class="flex-1">
                                <label class="text-[10px] font-bold text-gray-400 uppercase">Gols</label>
                                <input type="number" value="${
                                  jogador.gols > 0 ? jogador.gols : ""
                                }" placeholder="0"
                                    onchange="updateStat('${
                                      jogador.id
                                    }', 'gols', this.value)" 
                                    class="w-full bg-gray-50 rounded p-1 text-center font-bold outline-none focus:bg-blue-50 placeholder-gray-300">
                            </div>
                            <div class="flex-1">
                                <label class="text-[10px] font-bold text-gray-400 uppercase">Assist</label>
                                <input type="number" value="${
                                  jogador.assist > 0 ? jogador.assist : ""
                                }" placeholder="0"
                                    onchange="updateStat('${
                                      jogador.id
                                    }', 'assist', this.value)" 
                                    class="w-full bg-gray-50 rounded p-1 text-center font-bold outline-none focus:bg-blue-50 placeholder-gray-300">
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <label class="flex-1 cursor-pointer">
                                <input type="checkbox" class="peer hidden" ${
                                  jogador.bolaCheia ? "checked" : ""
                                } onclick="toggleDestaque('${
                        jogador.id
                      }', 'bolaCheia')">
                                <div class="border border-gray-200 rounded-lg p-2 text-center text-xs font-bold text-gray-400 peer-checked:bg-yellow-100 peer-checked:text-yellow-700 peer-checked:border-yellow-400 transition-all flex items-center justify-center gap-1">🔥 Bola Cheia</div>
                            </label>
                            <label class="flex-1 cursor-pointer">
                                <input type="checkbox" class="peer hidden" ${
                                  jogador.bolaMurcha ? "checked" : ""
                                } onclick="toggleDestaque('${
                        jogador.id
                      }', 'bolaMurcha')">
                                <div class="border border-gray-200 rounded-lg p-2 text-center text-xs font-bold text-gray-400 peer-checked:bg-gray-200 peer-checked:text-gray-700 peer-checked:border-gray-400 transition-all flex items-center justify-center gap-1">👎 Bola Murcha</div>
                            </label>
                        </div>
                    </div>
                `
                    : ""
                }
            `;
    listaContainer.appendChild(card);
  });
  atualizarContador();
}

iniciarSistema();
