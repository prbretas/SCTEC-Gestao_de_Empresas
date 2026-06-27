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
    const codigoConvite = document.getElementById("reg-codigo-convite").value.trim();
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

    const resultado = await AuthService.cadastrar(nome, senha, pergunta, resposta, codigoConvite);

    if (resultado.ok) {
      const { usuario, org } = resultado;
      const isAdmin = usuario.role === "admin";

      if (isAdmin) {
        sucessoEl.innerHTML = `
          ✅ Conta criada! Você é o <strong>Administrador</strong>.<br>
          Seu ID: <strong>#${usuario.id}</strong> &nbsp;|&nbsp;
          Código da sua organização: <strong>${org.codigoConvite}</strong><br>
          <small class="text-muted">Compartilhe o código com outros usuários para convidá-los.</small>
        `;
      } else {
        sucessoEl.innerHTML = `
          ✅ Conta criada! Bem-vindo à organização <strong>${org?.nome || ""}</strong>.<br>
          Seu ID: <strong>#${usuario.id}</strong>
        `;
      }

      sucessoEl.classList.remove("d-none");
      setTimeout(() => { window.location.href = "login.html"; }, 3500);
    } else {
      erroEl.textContent = resultado.erro;
      erroEl.classList.remove("d-none");
      btnCadastrar.disabled = false;
      btnCadastrar.textContent = "Criar Conta";
    }
  });
});
