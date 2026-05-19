import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById('form-primeiro-acesso');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cpfInput = document.getElementById('cad-cpf').value;
    const emailInput = document.getElementById('cad-email').value;
    const senhaInput = document.getElementById('cad-senha').value;

    try {
        const profsRef = ref(db, 'professores');
        const snapshot = await get(profsRef);

        if (snapshot.exists()) {
            let chaveOriginal = null;
            let dadosProfessor = null;
            snapshot.forEach((childSnapshot) => {
                const dados = childSnapshot.val();
                if (dados.cpf === cpfInput && dados.email === emailInput) {
                    chaveOriginal = childSnapshot.key;
                    dadosProfessor = dados;
                }
            });

            if (chaveOriginal) {
                const userCredential = await createUserWithEmailAndPassword(auth, emailInput, senhaInput);
                const uid = userCredential.user.uid;
                const updates = {};
                updates[`professores/${uid}`] = {
                    cpf: dadosProfessor.cpf,
                    disciplina: dadosProfessor.disciplina,
                    email: dadosProfessor.email,
                    nome: dadosProfessor.nome
                };
                updates[`professores/${chaveOriginal}`] = null;
                await update(ref(db), updates);

                alert("Cadastro concluído! Agora você pode entrar.");
                window.location.href = "index.html";
            } else {
                alert("Dados não encontrados. Verifique seu CPF e E-mail.");
            }
        }
    } catch (error) {
        alert("Erro ao cadastrar: " + error.message);
    }
});