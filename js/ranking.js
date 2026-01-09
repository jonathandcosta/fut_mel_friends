let dadosConsolidados = [];
let statsTimes = {
  azul: {
    nome: "Azul",
    v: 0,
    d: 0,
    e: 0,
    pts: 0,
    gp: 0,
    cor: "bg-blue-600",
    text: "text-blue-100",
  },
  amarelo: {
    nome: "Amarelo",
    v: 0,
    d: 0,
    e: 0,
    pts: 0,
    gp: 0,
    cor: "bg-yellow-500",
    text: "text-yellow-900",
  },
  verde: {
    nome: "Verde",
    v: 0,
    d: 0,
    e: 0,
    pts: 0,
    gp: 0,
    cor: "bg-green-600",
    text: "text-green-100",
  },
};
let tabAtual = "times"; // Começa mostrando os Times

// 1. CARREGAR E CALCULAR
async function carregarEstatisticas() {
  try {
    const snapshot = await db.collection("partidas").get();

    const mapaJogadores = {};
    let totalJogos = 0;

    // Zera stats dos times
    ["azul", "amarelo", "verde"].forEach((t) => {
      statsTimes[t].v = 0;
      statsTimes[t].d = 0;
      statsTimes[t].e = 0;
      statsTimes[t].pts = 0;
      statsTimes[t].gp = 0;
    });

    snapshot.forEach((doc) => {
      totalJogos++;
      const partida = doc.data();

      // --- A. Processar PLACAR (Times) ---
      if (partida.placar) {
        processarJogo(partida.placar.az_am, "azul", "amarelo");
        processarJogo(partida.placar.az_vd, "azul", "verde");
        processarJogo(partida.placar.vd_am, "verde", "amarelo");
      }

      // --- B. Processar JOGADORES ---
      const jogadoresPartida = partida.jogadores || [];
      jogadoresPartida.forEach((jogador) => {
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
            contagemTimes: { azul: 0, amarelo: 0, verde: 0 },
          };
        }

        if (jogador.presente) {
          mapaJogadores[jogador.id].presencas += 1;
          mapaJogadores[jogador.id].gols += jogador.gols || 0;
          mapaJogadores[jogador.id].assist += jogador.assist || 0;
          if (jogador.bolaCheia) mapaJogadores[jogador.id].bolaCheia += 1;
          if (jogador.bolaMurcha) mapaJogadores[jogador.id].bolaMurcha += 1;

          // Conta em quais times ele jogou
          if (jogador.times && Array.isArray(jogador.times)) {
            jogador.times.forEach((cor) => {
              if (mapaJogadores[jogador.id].contagemTimes[cor] !== undefined) {
                mapaJogadores[jogador.id].contagemTimes[cor]++;
              }
            });
          }
        }
        // Atualiza nome mais recente
        mapaJogadores[jogador.id].nome = jogador.nome;
        mapaJogadores[jogador.id].tipo = jogador.tipo;
      });
    });

    // Determina o "Time do Coração" de cada jogador
    dadosConsolidados = Object.values(mapaJogadores).map((j) => {
      // Descobre qual cor tem o maior valor
      let maior = 0;
      let timeFav = null;
      for (const [cor, qtd] of Object.entries(j.contagemTimes)) {
        if (qtd > maior) {
          maior = qtd;
          timeFav = cor;
        }
      }
      j.timeFavorito = timeFav; // 'azul', 'amarelo', 'verde' ou null
      return j;
    });

    document.getElementById(
      "total-jogos-label"
    ).innerText = `Baseado em ${totalJogos} jogos realizados`;
    renderizarRanking();
  } catch (error) {
    console.error(error);
  }
}

// Função auxiliar para calcular vitória/empate/derrota
function processarJogo(placarObj, timeA, timeB) {
  if (!placarObj || placarObj.a === "" || placarObj.b === "") return;

  const golsA = parseInt(placarObj.a);
  const golsB = parseInt(placarObj.b);

  statsTimes[timeA].gp += golsA;
  statsTimes[timeB].gp += golsB;

  if (golsA > golsB) {
    statsTimes[timeA].v++;
    statsTimes[timeA].pts += 3;
    statsTimes[timeB].d++;
  } else if (golsB > golsA) {
    statsTimes[timeB].v++;
    statsTimes[timeB].pts += 3;
    statsTimes[timeA].d++;
  } else {
    statsTimes[timeA].e++;
    statsTimes[timeA].pts += 1;
    statsTimes[timeB].e++;
    statsTimes[timeB].pts += 1;
  }
}

// 2. RENDERIZAR
function renderizarRanking() {
  const container = document.getElementById("lista-ranking");
  container.innerHTML = "";

  // --- MODO TIMES ---
  if (tabAtual === "times") {
    const listaTimes = [
      statsTimes.azul,
      statsTimes.amarelo,
      statsTimes.verde,
    ].sort((a, b) => b.pts - a.pts || b.v - a.v || b.gp - a.gp);

    listaTimes.forEach((time, index) => {
      let trofeu = index === 0 ? "🏆" : index + 1 + "º";

      container.innerHTML += `
                      <div class="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                          <div class="${time.cor} p-3 flex justify-between items-center ${time.text}">
                              <h3 class="font-bold text-lg flex items-center gap-2">
                                  <span>${trofeu}</span> ${time.nome}
                              </h3>
                              <span class="text-2xl font-black">${time.pts} <span class="text-xs font-normal opacity-75">pts</span></span>
                          </div>
                          <div class="flex justify-between p-4 text-center">
                              <div>
                                  <p class="text-xl font-bold text-white">${time.v}</p>
                                  <p class="text-[10px] text-gray-500 uppercase">Vitórias</p>
                              </div>
                              <div>
                                  <p class="text-xl font-bold text-white">${time.e}</p>
                                  <p class="text-[10px] text-gray-500 uppercase">Empates</p>
                              </div>
                              <div>
                                  <p class="text-xl font-bold text-white">${time.d}</p>
                                  <p class="text-[10px] text-gray-500 uppercase">Derrotas</p>
                              </div>
                              <div>
                                  <p class="text-xl font-bold text-white">${time.gp}</p>
                                  <p class="text-[10px] text-gray-500 uppercase">Gols Pró</p>
                              </div>
                          </div>
                      </div>
                  `;
    });
    return;
  }

  // --- MODO JOGADORES ---
  let listaOrdenada = [];

  if (tabAtual === "gols")
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.gols - a.gols || a.presencas - b.presencas
    );
  else if (tabAtual === "assist")
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.assist - a.assist || b.gols - a.gols
    );
  else if (tabAtual === "presenca")
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.presencas - a.presencas || b.gols - a.gols
    );
  else if (tabAtual === "destaques")
    listaOrdenada = [...dadosConsolidados].sort(
      (a, b) => b.bolaCheia - a.bolaCheia
    );

  // Filtro para esconder quem tem 0 (exceto presença)
  if (tabAtual !== "presenca")
    listaOrdenada = listaOrdenada.filter(
      (j) => j[tabAtual === "destaques" ? "bolaCheia" : tabAtual] > 0
    );

  if (listaOrdenada.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-500 mt-10">Sem dados ainda.</div>';
    return;
  }

  listaOrdenada.forEach((jogador, index) => {
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

    // Define a bolinha do time do coração
    let iconeTime = "";
    if (jogador.timeFavorito === "azul")
      iconeTime =
        '<span class="w-2 h-2 rounded-full bg-blue-500 inline-block ml-2" title="Joga mais no Azul"></span>';
    if (jogador.timeFavorito === "amarelo")
      iconeTime =
        '<span class="w-2 h-2 rounded-full bg-yellow-400 inline-block ml-2" title="Joga mais no Amarelo"></span>';
    if (jogador.timeFavorito === "verde")
      iconeTime =
        '<span class="w-2 h-2 rounded-full bg-green-500 inline-block ml-2" title="Joga mais no Verde"></span>';

    const card = document.createElement("div");
    card.className = `flex items-center justify-between p-4 rounded-xl border-l-4 shadow-sm ${fundo} ${borda}`;

    card.innerHTML = `
                  <div class="flex items-center gap-4">
                      <div class="text-xl">${posicao}</div>
                      <div>
                          <p class="font-bold text-lg text-gray-100 capitalize leading-none flex items-center">
                            ${jogador.nome} ${iconeTime}
                          </p>
                          <p class="text-xs text-gray-400 mt-1 uppercase font-bold">${jogador.tipo}</p>
                      </div>
                  </div>
                  <div class="text-right">
                      <p class="text-2xl font-bold text-white leading-none">${destaqueValor}</p>
                      <p class="text-[10px] text-gray-500 uppercase font-bold">${destaqueLabel}</p>
                  </div>
              `;

    if (tabAtual === "destaques" && jogador.bolaMurcha > 0) {
      card.innerHTML += `
                      <div class="ml-4 border-l border-gray-700 pl-4 text-center">
                          <p class="text-xl font-bold text-gray-500">${jogador.bolaMurcha}</p>
                          <p class="text-[10px] text-gray-600 uppercase">👎</p>
                      </div>
                  `;
      card.className += " gap-4"; // Ajuste de layout
      card
        .querySelector(".flex.items-center.justify-between")
        .classList.remove("justify-between");
      card.querySelector(".text-right").classList.add("ml-auto");
    }

    container.appendChild(card);
  });
}

function mudarTab(novaTab) {
  tabAtual = novaTab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.className =
      "tab-btn bg-gray-700 text-gray-300 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-all";
  });
  const btnAtivo = document.getElementById(`btn-${novaTab}`);
  btnAtivo.className =
    "tab-btn bg-yellow-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap shadow-lg scale-105 transition-all";
  renderizarRanking();
}

carregarEstatisticas();
