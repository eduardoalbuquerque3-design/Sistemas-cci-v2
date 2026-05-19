import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65",
    measurementId: "G-7ZXR8J734L"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById('form-login');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    console.log("Iniciando autenticação...");

    signInWithEmailAndPassword(auth, email, senha)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;
            console.log("Login realizado! UID:", uid);

            try {
                const coordRef = ref(db, 'coordenacao/' + uid);
                const snapCoord = await get(coordRef);

                if (snapCoord.exists()) {
                    const dados = snapCoord.val();
                    console.log("Perfil identificado: GESTÃO");
                    localStorage.setItem('usuarioNome', dados.nome || "Gestor");
                    window.location.href = "CORD_painel.html";
                }
                else {
                    const profRef = ref(db, 'professores/' + uid);
                    const snapProf = await get(profRef);

                    if (snapProf.exists()) {
                        const dados = snapProf.val();
                        console.log("Perfil identificado: PROFESSOR");
                        localStorage.setItem('usuarioNome', dados.nome || "Professor");
                        window.location.href = "PROF_painel.html";
                    }
                    else {
                        console.error("UID não encontrado no Realtime Database");
                        alert("Erro: Usuário sem permissões de acesso (UID não encontrado no banco).");
                    }
                }
            } catch (error) {
                console.error("Erro ao acessar o banco de dados:", error);
                alert("Erro técnico ao verificar seu perfil.");
            }
        })
        .catch((error) => {
            console.error("Erro de login:", error.code);

            if (error.code === 'auth/invalid-credential') {
                alert("E-mail ou senha incorretos.");
            } else {
                alert("Falha ao entrar: " + error.message);
            }
        });
});