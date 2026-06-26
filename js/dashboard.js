/**
 * DashboardController — Gerencia os gráficos e indicadores analíticos
 * Utiliza Chart.js para visualização de dados armazenados no localStorage
 */

const DashboardController = {
  registros: [],
  charts: {},

  init() {
    // Carrega dados do localStorage
    this.registros = EmpreendimentoStorage.buscarTodos();

    // Aplica dark mode se necessário
    this.aplicarDarkMode();

    // Renderiza indicadores
    this.renderizarIndicadores();

    // Renderiza gráficos
    this.renderizarGraficos();

    // Renderiza últimos registros
    this.renderizarUltimosRegistros();

    // Listener para dark mode toggle
    const darkModeSwitch = document.querySelector("#dark-mode-switch");
    if (darkModeSwitch) {
      darkModeSwitch.checked = document.body.classList.contains("dark-mode");
      darkModeSwitch.addEventListener("change", () => {
        this.toggleDarkMode();
      });
    }
  },

  /**
   * Renderiza os indicadores principais (cards)
   */
  renderizarIndicadores() {
    if (this.registros.length === 0) {
      document.querySelector("#ind-total").textContent = "0";
      return;
    }

    const total = this.registros.length;
    const ativos = this.registros.filter((r) => r.status === "Ativo").length;
    const inativos = total - ativos;

    document.querySelector("#ind-total").textContent = total;
    document.querySelector("#ind-ativos").textContent = ativos;
    document.querySelector("#ind-inativos").textContent = inativos;

    // Segmento mais frequente
    const segmentos = this.agruparPor(this.registros, "segmento");
    const segmentoMaisFreq = Object.entries(segmentos).sort(
      ([, a], [, b]) => b.length - a.length,
    )[0];
    if (segmentoMaisFreq) {
      document.querySelector("#ind-segmento").textContent =
        segmentoMaisFreq[0] || "N/A";
      document.querySelector("#ind-segmento-qtd").textContent =
        `${segmentoMaisFreq[1].length} registros`;
    }

    // Município mais frequente
    const municipios = this.agruparPor(this.registros, "municipio");
    const municipioMaisFreq = Object.entries(municipios).sort(
      ([, a], [, b]) => b.length - a.length,
    )[0];
    if (municipioMaisFreq) {
      document.querySelector("#ind-municipio").textContent =
        municipioMaisFreq[0] || "N/A";
      document.querySelector("#ind-municipio-qtd").textContent =
        `${municipioMaisFreq[1].length} registros`;
    }

    // Registros sem e-mail
    const semEmail = this.registros.filter(
      (r) => !r.email || r.email.trim() === "",
    ).length;
    document.querySelector("#ind-sem-email").textContent = semEmail;

    // Registros sem telefone
    const semTelefone = this.registros.filter(
      (r) => !r.telefone || r.telefone.trim() === "",
    ).length;
    document.querySelector("#ind-sem-telefone").textContent = semTelefone;
  },

  /**
   * Renderiza todos os gráficos
   */
  renderizarGraficos() {
    this.renderizarGraficoSegmento();
    this.renderizarGraficoStatus();
    this.renderizarGraficoMunicipios();
    this.renderizarGraficoEvolucao();
  },

  /**
   * Gráfico Pizza - Distribuição por Segmento
   */
  renderizarGraficoSegmento() {
    const ctx = document.querySelector("#chart-segmento");
    if (!ctx) return;

    const segmentos = this.agruparPor(this.registros, "segmento");
    const labels = Object.keys(segmentos);
    const data = labels.map((label) => segmentos[label].length);

    if (this.charts.segmento) this.charts.segmento.destroy();

    this.charts.segmento = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#FF6384",
              "#C9CBCF",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
          },
        },
      },
    });
  },

  /**
   * Gráfico Rosca - Ativo vs Inativo
   */
  renderizarGraficoStatus() {
    const ctx = document.querySelector("#chart-status");
    if (!ctx) return;

    const ativos = this.registros.filter((r) => r.status === "Ativo").length;
    const inativos = this.registros.length - ativos;

    if (this.charts.status) this.charts.status.destroy();

    this.charts.status = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["🟢 Ativo", "🔴 Inativo"],
        datasets: [
          {
            data: [ativos, inativos],
            backgroundColor: ["#28a745", "#dc3545"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
          },
        },
      },
    });
  },

  /**
   * Gráfico Barras - Top 10 Municípios
   */
  renderizarGraficoMunicipios() {
    const ctx = document.querySelector("#chart-municipios");
    if (!ctx) return;

    const municipios = this.agruparPor(this.registros, "municipio");
    const sorted = Object.entries(municipios)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10);

    const labels = sorted.map(([label]) => label);
    const data = sorted.map(([, items]) => items.length);

    if (this.charts.municipios) this.charts.municipios.destroy();

    this.charts.municipios = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Quantidade",
            data,
            backgroundColor: "#36A2EB",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
            grid: {
              color: document.body.classList.contains("dark-mode")
                ? "#444"
                : "#e0e0e0",
            },
          },
          y: {
            ticks: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
            grid: {
              color: document.body.classList.contains("dark-mode")
                ? "#444"
                : "#e0e0e0",
            },
          },
        },
      },
    });
  },

  /**
   * Gráfico Linha - Evolução de Cadastros por Mês
   */
  renderizarGraficoEvolucao() {
    const ctx = document.querySelector("#chart-evolucao");
    if (!ctx) return;

    // Agrupa por mês de cadastro
    const meses = {};
    this.registros.forEach((r) => {
      if (r.dataCadastro) {
        const date = new Date(r.dataCadastro);
        const chave = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        meses[chave] = (meses[chave] || 0) + 1;
      }
    });

    const labels = Object.keys(meses).sort();
    const data = labels.map((label) => meses[label]);

    // Converte para escala acumulada
    let acumulado = 0;
    const dataAcumulada = data.map((d) => {
      acumulado += d;
      return acumulado;
    });

    if (this.charts.evolucao) this.charts.evolucao.destroy();

    this.charts.evolucao = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total Acumulado",
            data: dataAcumulada,
            borderColor: "#FFCE56",
            backgroundColor: "rgba(255, 206, 86, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
            grid: {
              color: document.body.classList.contains("dark-mode")
                ? "#444"
                : "#e0e0e0",
            },
          },
          y: {
            ticks: {
              color: document.body.classList.contains("dark-mode")
                ? "#e0e0e0"
                : "#333",
            },
            grid: {
              color: document.body.classList.contains("dark-mode")
                ? "#444"
                : "#e0e0e0",
            },
          },
        },
      },
    });
  },

  /**
   * Renderiza os últimos 5 registros cadastrados
   */
  renderizarUltimosRegistros() {
    const container = document.querySelector("#ultimos-registros");
    if (!container) return;

    if (this.registros.length === 0) {
      container.innerHTML =
        '<div class="text-muted">Nenhum registro cadastrado.</div>';
      return;
    }

    const ultimos = this.registros
      .sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro))
      .slice(0, 5);

    const html = ultimos
      .map((reg) => {
        const dataBR = new Date(reg.dataCadastro).toLocaleDateString("pt-BR");
        const status = reg.status === "Ativo" ? "🟢" : "🔴";
        return `
        <div class="mb-2 pb-2 border-bottom">
          <div class="d-flex justify-content-between">
            <strong>${status} ${reg.nome}</strong>
            <small class="text-muted">${dataBR}</small>
          </div>
          <small class="text-muted">${reg.registro} | ${reg.municipio}</small>
        </div>
      `;
      })
      .join("");

    container.innerHTML = html;
  },

  /**
   * Helper - Agrupa registros por um campo específico
   */
  agruparPor(arr, campo) {
    return arr.reduce((acc, item) => {
      const chave = item[campo] || "Não Informado";
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(item);
      return acc;
    }, {});
  },

  /**
   * Toggle Dark Mode
   */
  toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode"),
    );

    // Atualiza cores dos gráficos
    setTimeout(() => {
      this.renderizarGraficos();
    }, 100);
  },

  /**
   * Aplica dark mode se estava ativado anteriormente
   */
  aplicarDarkMode() {
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    }
  },
};

// Inicializa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    DashboardController.init(),
  );
} else {
  DashboardController.init();
}
