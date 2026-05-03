let dataSelecionada = "";
let horarioSelecionado = "";
let horariosOcupados = [];
let linkWhatsAppFinal = "";
const meuWhatsApp = "5567935015153";

/* ================= ELEMENTOS ================= */
const inputData = document.getElementById("dataAgenda");
const dropdownDatas = document.getElementById("dropdownDatas");
const formAgenda = document.getElementById("formAgenda");

/* ================= INICIAR DROPDOWN DE DATAS ================= */
gerarDatasDropdown();

/* ================= ABRIR DROPDOWN ================= */
inputData.addEventListener("focus", () => {
    dropdownDatas.classList.add("ativo");
});

inputData.addEventListener("click", () => {
    dropdownDatas.classList.add("ativo");
});

/* ================= MÁSCARA DD/MM/AAAA ================= */
inputData.addEventListener("input", async function () {
    let valor = this.value.replace(/\D/g, "");

    if (valor.length > 2) {
        valor = valor.slice(0, 2) + "/" + valor.slice(2);
    }

    if (valor.length > 5) {
        valor = valor.slice(0, 5) + "/" + valor.slice(5, 9);
    }

    this.value = valor;

    if (valor.length === 10) {
        const dataISO = converterDataBRparaISO(valor);

        if (!dataISO) {
            return abrirModal("Data inválida", "Digite uma data válida.");
        }

        dataSelecionada = dataISO;
        horarioSelecionado = "";
        horariosOcupados = [];

        limparHorarios();
        await carregarHorariosDaData(dataSelecionada);
    }
});

/* ================= FECHAR DROPDOWN AO CLICAR FORA ================= */
document.addEventListener("click", function (e) {
    if (!e.target.closest(".campo-data-personalizado")) {
        dropdownDatas.classList.remove("ativo");
    }
});

/* ================= GERAR DATAS NO DROPDOWN ================= */
function gerarDatasDropdown() {
    dropdownDatas.innerHTML = "";

    for (let i = 0; i < 15; i++) {
        const data = new Date();
        data.setDate(data.getDate() + i);

        const dataBR = formatarDataBR(data);
        const dataISO = formatarDataISO(data);

        const div = document.createElement("div");
        div.className = "data-opcao";
        div.innerText = dataBR;
        div.dataset.iso = dataISO;

        div.onclick = async () => {
            inputData.value = dataBR;
            dataSelecionada = dataISO;
            horarioSelecionado = "";
            horariosOcupados = [];

            dropdownDatas.classList.remove("ativo");

            limparHorarios();
            await carregarHorariosDaData(dataSelecionada);
        };

        dropdownDatas.appendChild(div);
    }
}

/* ================= CARREGAR HORÁRIOS DA DATA ================= */
async function carregarHorariosDaData(data) {
    try {
        const snapshot = await db.collection("agendamentos")
            .where("data", "==", data)
            .get();

        horariosOcupados = snapshot.docs.map(doc => doc.data().horario);

        atualizarHorariosBloqueados();

    } catch (erro) {
        console.error("Erro ao buscar horários:", erro);
        abrirModal("Erro", "Não foi possível carregar os horários dessa data.");
    }
}

/* ================= ATUALIZAR HORÁRIOS BLOQUEADOS ================= */
function atualizarHorariosBloqueados() {
    document.querySelectorAll(".horario").forEach(horario => {
        const hora = horario.innerText.trim();

        horario.classList.remove("bloqueado");

        if (horariosOcupados.includes(hora)) {
            horario.classList.add("bloqueado");
            horario.classList.remove("ativo");
        }
    });
}

/* ================= LIMPAR HORÁRIOS ================= */
function limparHorarios() {
    document.querySelectorAll(".horario").forEach(h => {
        h.classList.remove("ativo");
        h.classList.remove("bloqueado");
    });
}

/* ================= SELECIONAR HORÁRIO ================= */
document.querySelectorAll(".horario").forEach(h => {
    h.onclick = () => {
        if (!dataSelecionada) {
            return abrirModal("Atenção", "Escolha uma data primeiro.");
        }

        if (h.classList.contains("bloqueado")) {
            return abrirModal("Horário indisponível", "Esse horário já foi reservado nessa data.");
        }

        document.querySelectorAll(".horario").forEach(x => x.classList.remove("ativo"));
        h.classList.add("ativo");

        horarioSelecionado = h.innerText.trim();
    };
});

/* ================= FORMULÁRIO ================= */
formAgenda.onsubmit = async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const cidade = document.getElementById("cidade").value.trim();
    const empresa = document.getElementById("empresa").value.trim();
    const descricao = document.getElementById("descricao").value.trim();

    const servicos = [...document.querySelectorAll("input[type=checkbox]:checked")]
        .map(x => x.value);

    if (!dataSelecionada || !horarioSelecionado) {
        return abrirModal("Erro", "Escolha data e horário.");
    }

    if (!nome || !telefone || !cidade) {
        return abrirModal("Erro", "Preencha nome, WhatsApp e cidade.");
    }

    if (servicos.length === 0) {
        return abrirModal("Erro", "Escolha um serviço.");
    }

    if (horariosOcupados.includes(horarioSelecionado)) {
        return abrirModal("Horário indisponível", "Esse horário acabou de ser reservado por outra pessoa.");
    }

    try {
        await db.collection("agendamentos").add({
            nome,
            telefone,
            cidade,
            empresa,
            descricao,
            data: dataSelecionada,
            horario: horarioSelecionado,
            servicos,
            criadoEm: new Date()
        });

        horariosOcupados.push(horarioSelecionado);

        const mensagemWhatsApp = `
Olá, acabei de realizar um agendamento pelo site.

Nome: ${nome}
WhatsApp: ${telefone}
Cidade: ${cidade}
Empresa: ${empresa || "Não informado"}
Data escolhida: ${formatarData(dataSelecionada)}
Horário escolhido: ${horarioSelecionado}
Serviços: ${servicos.join(", ")}
Descrição: ${descricao || "Não informado"}

Aguardo a confirmação da reunião e o envio do link para participar no dia e horário escolhido.
`;

        linkWhatsAppFinal = `https://wa.me/${meuWhatsApp}?text=${encodeURIComponent(mensagemWhatsApp)}`;

        abrirModal(
            "Agendamento realizado!",
            `Sua reunião foi marcada para ${formatarData(dataSelecionada)} às ${horarioSelecionado}.

Agora clique em OK para enviar as informações para nosso WhatsApp.

No dia da reunião, aguarde nosso retorno com o link para participar da conversa.`
        );

        this.reset();

        dataSelecionada = "";
        horarioSelecionado = "";
        horariosOcupados = [];

        limparHorarios();

    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        abrirModal("Erro", "Não foi possível salvar o agendamento.");
    }
};

/* ================= FORMATAR DATA BR ================= */
function formatarDataBR(data) {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

/* ================= FORMATAR DATA ISO ================= */
function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

/* ================= CONVERTER DATA BR PARA ISO ================= */
function converterDataBRparaISO(dataBR) {
    const partes = dataBR.split("/");

    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    const data = new Date(ano, mes - 1, dia);

    if (
        data.getDate() !== dia ||
        data.getMonth() !== mes - 1 ||
        data.getFullYear() !== ano
    ) {
        return null;
    }

    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/* ================= FORMATAR DATA PARA MODAL ================= */
function formatarData(data) {
    const partes = data.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/* ================= MODAL ================= */
function abrirModal(titulo, texto) {
  document.getElementById("modalTitulo").innerText = titulo;
  document.getElementById("modalTexto").innerText = texto;
  document.getElementById("modal").style.display = "flex";

  const btnModal = document.getElementById("btnModal");

  btnModal.onclick = function () {
    fecharModal();

    if (linkWhatsAppFinal) {
      window.open(linkWhatsAppFinal, "_blank");
      linkWhatsAppFinal = "";
    }
  };
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}