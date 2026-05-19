const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

let cacheAlunos = {};
let alunoAtualId = null;
let mesSelecionado = new Date().getMonth();

/* =========================================
   ABRIR TURMAS
========================================= */

function abrirTurma(evento, idSala) {

    document.querySelectorAll('.tabela-turma')
        .forEach(tabela => {

            tabela.classList.remove('ativa');

        });

    document.querySelectorAll('.tab')
        .forEach(tab => {

            tab.classList.remove('active');

        });

    document.getElementById(idSala)
        .classList.add('ativa');

    evento.currentTarget
        .classList.add('active');

    carregarAlunos();
}

/* =========================================
   CARREGAR ALUNOS
========================================= */

function carregarAlunos() {

    const aba = document.querySelector('.tab.active');

    if (!aba) return;

    let sala = aba.innerText.trim();

    // Corrige apenas se vier sem zero
    if (sala === "Sala 1") sala = "Sala 01";
    if (sala === "Sala 2") sala = "Sala 02";
    if (sala === "Sala 3") sala = "Sala 03";
    if (sala === "Sala 4") sala = "Sala 04";

    console.log("Buscando alunos da:", sala);

    const tbody = document.querySelector('.tabela-turma.ativa tbody');

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="2" style="text-align:center;">
                Carregando alunos...
            </td>
        </tr>
    `;

    database
        .ref('alunos')
        .orderByChild('turma')
        .equalTo(sala)
        .once('value', snapshot => {

            tbody.innerHTML = "";

            cacheAlunos = {};

            if (!snapshot.exists()) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="2" style="text-align:center;">
                            Nenhum aluno encontrado.
                        </td>
                    </tr>
                `;

                return;
            }

            snapshot.forEach(child => {

                const aluno = child.val();

                const id = child.key;

                cacheAlunos[id] = aluno;

                criarLinhaAluno(id, aluno, tbody);

            });

        });
}

/* =========================================
   LINHA DO ALUNO
========================================= */

function criarLinhaAluno(id, aluno, tbody) {

    const faltas = aluno.faltas_porSemestre || 0;

    const classeCor = faltas >= 10
        ? 'num-vermelho'
        : 'num-verde';

    const tr = document.createElement('tr');

    tr.innerHTML = `

        <td>

            <div class="nome-col nome-clicavel"
                 onclick="abrirModal('${id}')">

                <img class="user-avatar"
                     src="https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome_completo)}&background=16a34a&color=fff">

                <div>

                    <strong>${aluno.nome_completo}</strong>

                </div>

            </div>

        </td>

        <td>

            <div class="frequencia-col">

                <span>

                    Faltou

                    <span class="num-faltas ${classeCor}">
                        ${faltas}
                    </span>

                    dias

                </span>

                <div class="botoes-falta">

                    <button class="btn-mais"
                            onclick="atualizarFalta('${id}', 'F')">

                        +

                    </button>

                    <button class="btn-justificada"
                            onclick="atualizarFalta('${id}', 'J')">

                        J

                    </button>

                    <button class="btn-menos"
                            onclick="atualizarFalta('${id}', 'R')">

                        -

                    </button>

                </div>

            </div>

        </td>

    `;

    tbody.appendChild(tr);
}

/* =========================================
   ATUALIZAR FALTA
========================================= */

async function atualizarFalta(id, tipo) {

    const hoje = new Date()
        .toISOString()
        .split('T')[0];

    const refRegistro =
        database.ref(`alunos/${id}/registro_faltas/${hoje}`);

    const refContador =
        database.ref(`alunos/${id}/faltas_porSemestre`);

    try {

        let novoValor =
            Number(cacheAlunos[id].faltas_porSemestre || 0);

        if (!cacheAlunos[id].registro_faltas) {
            cacheAlunos[id].registro_faltas = {};
        }

        const jaExiste =
            cacheAlunos[id].registro_faltas[hoje];

        /* =========================
           REMOVER FALTA
        ========================= */

        if (tipo === 'R') {

            if (jaExiste === 'F') {
                novoValor--;
            }

            await refRegistro.remove();

            delete cacheAlunos[id]
                .registro_faltas[hoje];
        }

        /* =========================
           ADICIONAR FALTA
        ========================= */

        else if (tipo === 'F') {

            if (jaExiste !== 'F') {
                novoValor++;
            }

            await refRegistro.set('F');

            cacheAlunos[id]
                .registro_faltas[hoje] = 'F';
        }

        /* =========================
           JUSTIFICADA
        ========================= */

        else if (tipo === 'J') {

            // Se antes era falta normal
            if (jaExiste === 'F') {
                novoValor--;
            }

            await refRegistro.set('J');

            cacheAlunos[id]
                .registro_faltas[hoje] = 'J';
        }

        // evita negativo
        if (novoValor < 0) {
            novoValor = 0;
        }

        /* =========================
           SALVA NO FIREBASE
        ========================= */

        await refContador.set(novoValor);

        /* =========================
           ATUALIZA CACHE
        ========================= */

        cacheAlunos[id].faltas_porSemestre =
            novoValor;

        /* =========================
           ATUALIZA TELA
        ========================= */

        carregarAlunos();

        /* =========================
           ATUALIZA MODAL
        ========================= */

        if (alunoAtualId === id) {

            document.getElementById(
                'm-faltas-total'
            ).innerText = novoValor;

            renderizarCalendario(
                cacheAlunos[id].registro_faltas
            );
        }

    } catch (erro) {

        console.error(erro);

        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar falta',
            background: '#0f172a',
            color: '#fff'
        });
    }
}

/* =========================================
   MODAL
========================================= */

function abrirModal(id) {

    alunoAtualId = id;

    const aluno = cacheAlunos[id];

    if (!aluno) return;

    document.getElementById('m-nome-display').innerText =
        aluno.nome_completo || '';

    document.getElementById('m-faltas-total').innerText =
        aluno.faltas_porSemestre || 0;

    const setValor = (idCampo, valor) => {

        const campo = document.getElementById(idCampo);

        if (campo) {

            campo.value = valor || '';

        }
    };

    setValor('edit-email', aluno.email);

    const endereco = aluno.endereco || {};

    setValor('edit-endereco', endereco.rua);

    setValor('edit-cep', endereco.cep);

    setValor('edit-bairro', endereco.bairro);

    setValor('edit-cidade', endereco.cidade);

    setValor('edit-uf', endereco.uf);

    setValor('edit-numero', endereco.numero);

    setValor('edit-complemento', endereco.complemento);

    setValor('edit-nome', aluno.nome_completo);

    setValor('edit-turma', aluno.turma);

    setValor('edit-id', id);

    setValor('edit-cpf', aluno.cpf_aluno);

    setValor(
        'edit-nascimento',
        aluno.data_nascimento ||
        aluno.nascimento
    );

    setValor(
        'edit-resp-parentesco',
        aluno.parentesco_responsavel ||
        aluno.parentesco
    );

    setValor('edit-tel', aluno.telefone);

    setValor('edit-resp-nome', aluno.nome_responsavel);

    setValor('edit-resp-tel', aluno.telefone_responsavel);

    setValor('edit-turno', aluno.horario);

    setValor('edit-modulo', aluno.modulo);

    setValor('edit-disciplina', aluno.disciplina);

    setValor('edit-situacao', aluno.situacao);

    setValor('edit-resp-cpf', aluno.cpf_responsavel);

    const escola = aluno.escola_regular || {};

    setValor(
        'edit-escola-nome',
        escola.nome
    );

    setValor(
        'edit-escola-ano',
        escola.ano
    );

    setValor(
        'edit-escola-turma',
        escola.turma
    );

    document.getElementById('modalAluno').style.display = "flex";

    bloquearEdicao();

    mudarMes(new Date().getMonth());
}

function fecharModal() {

    document.getElementById('modalAluno')
        .style.display = "none";
}

/* =========================================
   CALENDARIO
========================================= */

function mudarMes(mes) {

    mesSelecionado = mes;

    document.querySelectorAll('#seletor-meses button')
        .forEach((btn, index) => {

            btn.classList.toggle('active', index === mes);

        });

    const aluno = cacheAlunos[alunoAtualId];

    if (aluno) {

        renderizarCalendario(aluno.registro_faltas);

    }
}

function renderizarCalendario(faltas) {

    const calendario =
        document.getElementById('calendario-faltas');

    calendario.innerHTML = "";

    const ano = 2026;

    const primeiroDia =
        new Date(ano, mesSelecionado, 1).getDay();

    const ultimoDia =
        new Date(ano, mesSelecionado + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) {

        calendario.innerHTML += `<div></div>`;

    }

    for (let dia = 1; dia <= ultimoDia; dia++) {

        const data =
            `${ano}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        const div = document.createElement('div');

        div.classList.add('dia-calendario');

        div.innerText = dia;

        if (faltas && faltas[data]) {

            if (faltas[data] === 'F') {

                div.classList.add('dia-com-falta');

            }

            if (faltas[data] === 'J') {

                div.classList.add('dia-justificado');

            }
        }

        calendario.appendChild(div);
    }
}

/* =========================================
   EDIÇÃO
========================================= */

function habilitarEdicao() {

    document.querySelectorAll('#form-detalhes input')
        .forEach(input => {

            if (input.id !== 'edit-id') {

                input.readOnly = false;

                input.style.background = '#0f172a';

            }

        });

    const modal =
        document.querySelector('.modal-content');

    modal.classList.add('modo-edicao');

    document.getElementById('btn-editar')
        .style.display = "none";

    document.getElementById('btn-salvar')
        .style.display = "inline-flex";

    Swal.fire({
        icon: 'info',
        title: 'Modo edição ativado',
        text: 'Agora você pode editar os dados do aluno.',
        timer: 1800,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
    });
}

function bloquearEdicao() {

    document.querySelectorAll('#form-detalhes input')
        .forEach(input => {

            input.readOnly = true;

            input.style.background = '#020817';

        });

    const modal =
        document.querySelector('.modal-content');

    modal.classList.remove('modo-edicao');

    document.getElementById('btn-editar')
        .style.display = "inline-flex";

    document.getElementById('btn-salvar')
        .style.display = "none";
}

/* =========================================
   SALVAR
========================================= */

async function salvarEdicao() {

    const id =
        document.getElementById('edit-id').value;

const dados = {

    email:
        document.getElementById('edit-email').value,

    nome_completo:
        document.getElementById('edit-nome').value,

    data_nascimento:
        document.getElementById('edit-nascimento').value,

    cpf_aluno:
        document.getElementById('edit-cpf').value,

    telefone:
        document.getElementById('edit-tel').value,

    nome_responsavel:
        document.getElementById('edit-resp-nome').value,

    cpf_responsavel:
        document.getElementById('edit-resp-cpf').value,

    telefone_responsavel:
        document.getElementById('edit-resp-tel').value,

    parentesco_responsavel:
        document.getElementById('edit-resp-parentesco').value,

    endereco: {
        cep: document.getElementById('edit-cep').value,
        rua: document.getElementById('edit-endereco').value,
        numero: document.getElementById('edit-numero').value,
        bairro: document.getElementById('edit-bairro').value,
        cidade: document.getElementById('edit-cidade').value,
        uf: document.getElementById('edit-uf').value,
        complemento: document.getElementById('edit-complemento').value
    },

    escola_regular: {
        nome:
            document.getElementById('edit-escola-nome').value,

        ano:
            document.getElementById('edit-escola-ano').value,

        turma:
            document.getElementById('edit-escola-turma').value
    }
};

    try {

        await database.ref(`alunos/${id}`).update(dados);

        bloquearEdicao();

        carregarAlunos();

        Swal.fire({
            icon: 'success',
            title: 'Informações atualizadas!',
            text: 'Os dados do aluno foram salvos.',
            timer: 1800,
            showConfirmButton: false,

            background: '#0f172a',
            color: '#fff',

            showClass: {
                popup: `
                    animate__animated
                    animate__fadeInUp
                    animate__faster
                `
            },

            hideClass: {
                popup: `
                    animate__animated
                    animate__fadeOutDown
                    animate__faster
                `
            }
        });

    } catch (erro) {

        console.error(erro);

        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            background: '#0f172a',
            color: '#fff'
        });
    }
}

/* =========================================
   FILTRO
========================================= */

function filtrarTabela() {

    const valor =
        document.getElementById('inputBusca')
            .value
            .toLowerCase();

    document.querySelectorAll('.tabela-turma.ativa tbody tr')
        .forEach(tr => {

            tr.style.display =
                tr.innerText.toLowerCase().includes(valor)
                    ? ''
                    : 'none';

        });
}

/* =========================================
   PDF
========================================= */

function exportarPDF() {

    const modal = document.getElementById('modalAluno');

    if (modal) {

        modal.style.display = 'none';

    }

    document.body.classList.add('modo-print');

    setTimeout(() => {

        window.print();

        document.body.classList.remove('modo-print');

    }, 300);
}

/* =========================================
   LOGOUT
========================================= */

function fazerLogout() {

    localStorage.clear();

    window.location.href = "login.html";
}

/* =========================================
   EVENTOS
========================================= */

window.addEventListener('load', () => {

    carregarAlunos();

    const filtro =
        document.getElementById('filtroDisciplina');

    if (filtro) {

        filtro.addEventListener('change', carregarAlunos);

    }
});

window.onclick = (e) => {

    if (e.target.id === 'modalAluno') {

        fecharModal();

    }
};
