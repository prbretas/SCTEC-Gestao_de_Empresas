/**
 * register.js — Lógica da tela de cadastro de novo usuário.
 */
document.addEventListener("DOMContentLoaded", () => {
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Se já tem sessão, vai para home
  if (AuthService.obterSessao()) {
    window.location.href = "home.html";
    return;
  }

  // Toggle senha
  document.getElementById("btn-toggle-senha").addEventListener("click", () => {
    const input = document.getElementById("reg-senha");
    input.type = input.type === "password" ? "text" : "password";
  });

  // Submit do formulário
  document.getElementById("form-register").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("reg-nome").value;
    const senha = document.getElementById("reg-senha").value;
    const confirmar = document.getElementById("reg-confirmar").value;
    const pergunta = document.getElementById("reg-pergunta").value;
    const resposta = document.getElementById("reg-resposta").value;
    const erroEl = document.getElementById("reg-erro");
    const sucessoEl = document.getElementById("reg-sucesso");
    const btnCadastrar = document.getElementById("btn-cadastrar");

    erroEl.classList.add("d-none");
    sucessoEl.classList.add("d-none");

    if (senha !== confirmar) {
      erroEl.textContent = "As senhas não coincidem.";
      erroEl.classList.remove("d-none");
      return;
    }

    if (!pergunta) {
      erroEl.textContent = "Selecione uma pergunta secreta.";
      erroEl.classList.remove("d-none");
      return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = "Criando conta...";

    const resultado = await AuthService.cadastrar(nome, senha, pergunta, resposta);

    if (resultado.ok) {
      sucessoEl.textContent = `✅ Conta criada! Seu ID é #${resultado.usuario.id}. Redirecionando...`;
      sucessoEl.classList.remove("d-none");
      setTimeout(() => { window.location.href = "login.html"; }, 2000);
    } else {
      erroEl.textContent = resultado.erro;
      erroEl.classList.remove("d-none");
      btnCadastrar.disabled = false;
      btnCadastrar.textContent = "Criar Conta";
    }
  });
});
