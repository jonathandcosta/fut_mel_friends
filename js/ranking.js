// Variáveis Globais
let dadosConsolidados = []; // Lista final somada
let tabAtual = "gols"; // Padrão

// 1. CARREGAR E SOMAR TUDO
async function carregarEstatisticas() {
  try {
    // Pega TODAS as partidas salvas
    const snapshot = await db.collection("partidas").get();

    const mapaJogadores = {};
    let totalJogos = 0;

    snapshot.forEach((doc) => {
      totalJogos++;
      const partida = doc.data();
      const jogadoresPartida = partida.jogadores || [];

      jogadoresPartida.forEach((jogador) => {
        // Se o jogador ainda não está no mapa, cria ele
        if (!mapaJogadores[jogador.id]) {
          mapaJogadores[jogador.id] = {
            id: jogador.id,
            nome: jogador.nome,
            tipo: jogador.tipo,
            gols: 0,
            assist: 0,
            presencas: 0,
            bolaCheia: 0,
            bolaMurcha: 0,
          };
        }

        // Soma os dados se ele estava presente
        if (jogador.presente) {
          mapaJogadores[jogador.id].presencas += 1;
          mapaJogadores[jogador.id].gols += jogador.gols || 0;
          mapaJogadores[jogador.id].assist += jogador.assist || 0;
          if (jogador.bolaCheia) mapaJogadores[jogador.id].bolaCheia += 1;
          if (jogador.bolaMurcha) mapaJogadores[jogador.id].bolaMurcha += 1;
        }

        // Atualiza nome/tipo para o mais recente (caso tenha mudado)
        mapaJogadores[jogador.id].nome = jogador.nome;
        mapaJogadores[jogador.id].tipo = jogador.tipo;
      });
    });

    // Converte o Mapa em Array para podermos ordenar
    dadosConsolidados = Object.values(mapaJogadores);

    // Atualiza texto do cabeçalho
    document.getElementById(
      "total-jogos-label"
    ).innerText = `Baseado em ${totalJogos} jogos realizados`;

    renderizarRanking();
  } catch (error) {
    console.error("Erro ao carregar ranking:", error);
    document.getElementById("lista-ranking").innerHTML =
      '<p class="text-center text-red-400">Erro ao carregar dados.</p>';
  }
}

// 2. RENDERIZAR NA TELA
function renderizarRanking() {
  const container = document.getElementById("lista-ranking");
  container.innerHTML = "";

  // Ordena a lista baseada na TAB atual
  let listaOrdenada = [];

  if (tabAtual === "gols") {
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.gols - a.gols || a.presencas - b.presencas
    ); // Desempate por presença
  } else if (tabAtual === "assist") {
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.assist - a.assist || b.gols - a.gols
    );
  } else if (tabAtual === "presenca") {
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.presencas - a.presencas || b.gols - a.gols
    );
  } else if (tabAtual === "destaques") {
    // Critério especial: Saldo de (Bola Cheia - Bola Murcha)
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.bolaCheia - a.bolaCheia
    );
  }

  // Filtra quem tem 0 na estatística principal para não poluir (exceto presença)
  if (tabAtual !== "presenca") {
    listaOrdenada = listaOrdenada.filter(
      (j) => j[tabAtual === "destaques" ? "bolaCheia" : tabAtual] > 0
    );
  }

  if (listaOrdenada.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-500 mt-10">Ainda sem dados para este ranking.</div>';
    return;
  }

  listaOrdenada.forEach((jogador, index) => {
    // Define o ícone da posição
    let posicao = `<span class="font-bold text-gray-500 w-6 text-center">${
      index + 1
    }º</span>`;
    let borda = "border-gray-700";
    let fundo = "bg-gray-800";

    if (index === 0) {
      posicao = "🥇";
      borda = "border-yellow-500";
      fundo = "bg-gray-800/80 bg-gradient-to-r from-gray-800 to-yellow-900/20";
    } else if (index === 1) {
      posicao = "🥈";
      borda = "border-gray-400";
    } else if (index === 2) {
      posicao = "🥉";
      borda = "border-orange-700";
    }

    // Define qual dado mostrar em destaque
    let destaqueValor = "";
    let destaqueLabel = "";

    if (tabAtual === "gols") {
      destaqueValor = jogador.gols;
      destaqueLabel = "Gols";
    } else if (tabAtual === "assist") {
      destaqueValor = jogador.assist;
      destaqueLabel = "Assists";
    } else if (tabAtual === "presenca") {
      destaqueValor = jogador.presencas;
      destaqueLabel = "Jogos";
    } else if (tabAtual === "destaques") {
      destaqueValor = jogador.bolaCheia;
      destaqueLabel = "🔥";
    }

    const card = document.createElement("div");
    card.className = `flex items-center justify-between p-4 rounded-xl border-l-4 shadow-sm ${fundo} ${borda}`;

    card.innerHTML = `
                  <div class="flex items-center gap-4">
                      <div class="text-xl">${posicao}</div>
                      <div>
                          <p class="font-bold text-lg text-gray-100 capitalize leading-none">${jogador.nome}</p>
                          <p class="text-xs text-gray-400 mt-1 uppercase font-bold">${jogador.tipo}</p>
                      </div>
                  </div>
                  <div class="text-right">
                      <p class="text-2xl font-bold text-white leading-none">${destaqueValor}</p>
                      <p class="text-[10px] text-gray-500 uppercase font-bold">${destaqueLabel}</p>
                  </div>
              `;

    // Se for a aba destaques, adiciona a bola murcha também
    if (tabAtual === "destaques" && jogador.bolaMurcha > 0) {
      card.innerHTML += `
                      <div class="ml-4 border-l border-gray-700 pl-4 text-center">
                          <p class="text-xl font-bold text-gray-500">${jogador.bolaMurcha}</p>
                          <p class="text-[10px] text-gray-600 uppercase">👎</p>
                      </div>
                  `;
      // Ajusta layout flex
      card
        .querySelector(".flex.items-center.justify-between")
        .classList.remove("justify-between");
      card.className = `flex items-center p-4 rounded-xl border-l-4 shadow-sm ${fundo} ${borda} gap-4`;
      card.querySelector(".text-right").classList.add("ml-auto");
    }

    container.appendChild(card);
  });
}

// 3. CONTROLE DE ABAS
function mudarTab(novaTab) {
  tabAtual = novaTab;

  // Atualiza visual dos botões
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.className =
      "tab-btn bg-gray-700 text-gray-300 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-all";
  });

  const btnAtivo = document.getElementById(`btn-${novaTab}`);
  btnAtivo.className =
    "tab-btn bg-yellow-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap shadow-lg scale-105 transition-all";

  renderizarRanking();
}

// Start
carregarEstatisticas();
