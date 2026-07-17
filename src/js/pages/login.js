/**
 * login.js — Lógica da tela de login e recuperação de senha.
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Aplica config visual
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Se já tem sessão ativa, vai direto para home
  if (AuthService.obterSessao()) {
    window.location.href = "home.html";
    return;
  }

  const modalEl = document.getElementById("modal-recuperar");
  const modalRecuperar = new bootstrap.Modal(modalEl);

  // Toggle visibilidade senha
  document.getElementById("btn-toggle-senha").addEventListener("click", () => {
    const input = document.getElementById("login-senha");
    input.type = input.type === "password" ? "text" : "password";
  });

  // Submit do login
  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("login-nome").value;
    const senha = document.getElementById("login-senha").value;
    const erroEl = document.getElementById("login-erro");
    const btnEntrar = document.getElementById("btn-entrar");

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";
    erroEl.classList.add("d-none");

    const resultado = await AuthService.login(nome, senha);

    if (resultado.ok) {
      window.location.href = "home.html";
    } else {
      erroEl.textContent = resultado.erro;
      erroEl.classList.remove("d-none");
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
    }
  });

  // Abrir modal esqueci a senha
  document.getElementById("link-esqueci").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("rec-passo1").classList.remove("d-none");
    document.getElementById("rec-passo2").classList.add("d-none");
    document.getElementById("rec-nome").value = "";
    document.getElementById("rec-erro1").classList.add("d-none");
    modalRecuperar.show();
  });

  // Passo 1: buscar usuário e pergunta
  document.getElementById("btn-rec-buscar").addEventListener("click", () => {
    const nome = document.getElementById("rec-nome").value.trim();
    const erroEl = document.getElementById("rec-erro1");
    const pergunta = AuthService.obterPerguntaSecreta(nome);

    if (!pergunta) {
      erroEl.textContent = "Usuário não encontrado.";
      erroEl.classList.remove("d-none");
      return;
    }

    erroEl.classList.add("d-none");
    document.getElementById("rec-pergunta").textContent = pergunta;
    document.getElementById("rec-passo1").classList.add("d-none");
    document.getElementById("rec-passo2").classList.remove("d-none");
  });

  // Passo 2: redefinir senha
  document.getElementById("btn-rec-redefinir").addEventListener("click", async () => {
    const nome = document.getElementById("rec-nome").value.trim();
    const resposta = document.getElementById("rec-resposta").value;
    const novaSenha = document.getElementById("rec-nova-senha").value;
    const confirmar = document.getElementById("rec-confirmar-senha").value;
    const erroEl = document.getElementById("rec-erro2");
    const sucessoEl = document.getElementById("rec-sucesso");

    erroEl.classList.add("d-none");
    sucessoEl.classList.add("d-none");

    if (novaSenha !== confirmar) {
      erroEl.textContent = "As senhas não coincidem.";
      erroEl.classList.remove("d-none");
      return;
    }

    const resultado = await AuthService.redefinirSenha(nome, resposta, novaSenha);

    if (resultado.ok) {
      sucessoEl.textContent = "✅ Senha redefinida com sucesso! Faça login.";
      sucessoEl.classList.remove("d-none");
      setTimeout(() => modalRecuperar.hide(), 2000);
    } else {
      erroEl.textContent = resultado.erro;
      erroEl.classList.remove("d-none");
    }
  });
});
