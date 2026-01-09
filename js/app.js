let listaJogadoresLocal = [];
let rosterBase = [];
// Objeto para guardar o placar
let placarAtual = {
  az_am: { a: "", b: "" }, // Azul x Amarelo
  az_vd: { a: "", b: "" }, // Azul x Verde
  vd_am: { a: "", b: "" }, // Verde x Amarelo
};

const listaContainer = document.getElementById("lista-jogadores");
const contadorPresenca = document.getElementById("contador-presenca");
const inputData = document.getElementById("data-partida");
const statusJogo = document.getElementById("status-jogo");

// INICIALIZAÇÃO
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

// CARREGAMENTO DE DADOS
function sincronizarComCadastro(listaCarregada) {
  const listaAtualizada = [];
  rosterBase.forEach((jogadorBase) => {
    const jogadorExistente = listaCarregada.find(
      (j) => j.id === jogadorBase.id
    );
    if (jogadorExistente) {
      jogadorExistente.nome = jogadorBase.nome;
      jogadorExistente.tipo = jogadorBase.tipo;
      // Garante que a propriedade 'times' exista (migração de dados antigos)
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
    times: [], // Novo array de times
  };
}

async function carregarDadosDaPartida() {
  const dataSelecionada = inputData.value;
  listaContainer.innerHTML =
    '<p class="text-center text-gray-400 py-4">Buscando...</p>';

  let dadosParaRenderizar = [];
  let placarParaRenderizar = null; // Placar temporário

  // 1. Rascunho Local
  const rascunho = localStorage.getItem(`pelada_${dataSelecionada}`);
  const rascunhoPlacar = localStorage.getItem(`placar_${dataSelecionada}`);

  if (rascunho) {
    dadosParaRenderizar = JSON.parse(rascunho);
    if (rascunhoPlacar) placarParaRenderizar = JSON.parse(rascunhoPlacar);

    statusJogo.innerHTML = "⚠️ Rascunho";
    statusJogo.className =
      "text-center text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2 block";
  } else {
    // 2. Banco de Dados
    try {
      const docRef = db.collection("partidas").doc(dataSelecionada);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const dadosBanco = docSnap.data();
        dadosParaRenderizar = dadosBanco.jogadores;
        placarParaRenderizar = dadosBanco.placar; // Carrega placar do banco

        statusJogo.innerHTML = "✅ Jogo Salvo";
        statusJogo.className =
          "text-center text-xs font-bold uppercase tracking-widest text-green-600 mb-2 block";
      } else {
        dadosParaRenderizar = [];
        placarParaRenderizar = null; // Jogo novo = placar zerado
        statusJogo.innerHTML = "✨ Nova Partida";
        statusJogo.className =
          "text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block";
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  // Sincroniza Listas
  listaJogadoresLocal = sincronizarComCadastro(dadosParaRenderizar);

  // Sincroniza Placar (ou zera se não tiver)
  if (placarParaRenderizar) {
    placarAtual = placarParaRenderizar;
  } else {
    placarAtual = {
      az_am: { a: "", b: "" },
      az_vd: { a: "", b: "" },
      vd_am: { a: "", b: "" },
    };
  }

  renderizarLista();
  renderizarPlacar();
}

// Renderiza os valores nos inputs do placar
function renderizarPlacar() {
  document.getElementById("placar-az-am-1").value = placarAtual.az_am.a;
  document.getElementById("placar-az-am-2").value = placarAtual.az_am.b;

  document.getElementById("placar-az-vd-1").value = placarAtual.az_vd.a;
  document.getElementById("placar-az-vd-2").value = placarAtual.az_vd.b;

  document.getElementById("placar-vd-am-1").value = placarAtual.vd_am.a;
  document.getElementById("placar-vd-am-2").value = placarAtual.vd_am.b;
}

function salvarRascunhoLocal() {
  const dataSelecionada = inputData.value;

  // Atualiza objeto de placar com o que está nos inputs
  placarAtual = {
    az_am: {
      a: document.getElementById("placar-az-am-1").value,
      b: document.getElementById("placar-az-am-2").value,
    },
    az_vd: {
      a: document.getElementById("placar-az-vd-1").value,
      b: document.getElementById("placar-az-vd-2").value,
    },
    vd_am: {
      a: document.getElementById("placar-vd-am-1").value,
      b: document.getElementById("placar-vd-am-2").value,
    },
  };

  localStorage.setItem(
    `pelada_${dataSelecionada}`,
    JSON.stringify(listaJogadoresLocal)
  );
  localStorage.setItem(
    `placar_${dataSelecionada}`,
    JSON.stringify(placarAtual)
  ); // Salva placar tb

  statusJogo.innerHTML = "⚠️ Editando...";
  statusJogo.className =
    "text-center text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2 block";
}

function salvarDadosPartida() {
  const dataSelecionada = inputData.value;
  // Garante que o objeto placar esteja atualizado antes de enviar
  placarAtual = {
    az_am: {
      a: document.getElementById("placar-az-am-1").value,
      b: document.getElementById("placar-az-am-2").value,
    },
    az_vd: {
      a: document.getElementById("placar-az-vd-1").value,
      b: document.getElementById("placar-az-vd-2").value,
    },
    vd_am: {
      a: document.getElementById("placar-vd-am-1").value,
      b: document.getElementById("placar-vd-am-2").value,
    },
  };

  db.collection("partidas")
    .doc(dataSelecionada)
    .set({
      data: dataSelecionada,
      local: "Campo da SAMU",
      jogadores: listaJogadoresLocal,
      placar: placarAtual, // SALVA O PLACAR NO BANCO
      ultimaAtualizacao: new Date(),
    })
    .then(() => {
      localStorage.removeItem(`pelada_${dataSelecionada}`);
      localStorage.removeItem(`placar_${dataSelecionada}`);

      statusJogo.innerHTML = "✅ Jogo Salvo";
      statusJogo.className =
        "text-center text-xs font-bold uppercase tracking-widest text-green-600 mb-2 block";

      const toast = document.getElementById("toast-feedback");
      toast.classList.remove("hidden");
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 3000);
    })
    .catch((error) => {
      alert("Erro ao salvar!");
    });
}

// AÇÕES DA LISTA
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

// NOVA FUNÇÃO: Toggle Time (Azul, Amarelo, Verde)
function toggleTime(id, cor) {
  const jogador = listaJogadoresLocal.find((j) => j.id === id);
  if (jogador) {
    if (!jogador.times) jogador.times = [];

    // Se já tem a cor, remove. Se não tem, adiciona.
    if (jogador.times.includes(cor)) {
      jogador.times = jogador.times.filter((t) => t !== cor);
    } else {
      jogador.times.push(cor);
    }
    renderizarLista();
    salvarRascunhoLocal();
  }
}

// RENDERIZAÇÃO
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

    // Verifica quais times estão ativos para pintar as bolinhas
    const times = jogador.times || [];
    const azulAtivo = times.includes("azul")
      ? "bg-blue-500 ring-2 ring-blue-300"
      : "bg-gray-200 hover:bg-blue-200";
    const amareloAtivo = times.includes("amarelo")
      ? "bg-yellow-400 ring-2 ring-yellow-200"
      : "bg-gray-200 hover:bg-yellow-100";
    const verdeAtivo = times.includes("verde")
      ? "bg-green-500 ring-2 ring-green-300"
      : "bg-gray-200 hover:bg-green-200";

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
                        
                        <div class="flex items-center gap-4 mb-3 mt-2 justify-center bg-gray-50 p-2 rounded-lg">
                            <span class="text-[10px] font-bold text-gray-400 uppercase">Jogou no:</span>
                            <button onclick="toggleTime('${
                              jogador.id
                            }', 'azul')" class="w-6 h-6 rounded-full transition-all ${azulAtivo}" title="Time Azul"></button>
                            <button onclick="toggleTime('${
                              jogador.id
                            }', 'amarelo')" class="w-6 h-6 rounded-full transition-all ${amareloAtivo}" title="Time Amarelo"></button>
                            <button onclick="toggleTime('${
                              jogador.id
                            }', 'verde')" class="w-6 h-6 rounded-full transition-all ${verdeAtivo}" title="Time Verde"></button>
                        </div>

                        <div class="flex gap-4 border-t border-gray-100 pt-2 mb-3">
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

// MODAIS E CADASTRO
function abrirModalCadastro() {
  document.getElementById("modal-cadastro").classList.remove("hidden");
}
function fecharModais() {
  document.getElementById("modal-cadastro").classList.add("hidden");
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
    .add({ nome: nomeFormatado, tipo: tipo, dataCriacao: new Date() })
    .then(() => {
      fecharModais();
      document.getElementById("input-nome-novo").value = "";
    });
}

iniciarSistema();
