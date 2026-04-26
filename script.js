const reveal = () => {
    const elements = document.querySelectorAll('.reveal');
    
    elements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        // Se o elemento estiver visível na tela
        if (elementTop < windowHeight - 50) {
            el.classList.add('active');
        }
    });
};

// Executa ao carregar, ao rolar e ao redimensionar
window.addEventListener('scroll', reveal);
window.addEventListener('load', reveal);
window.addEventListener('resize', reveal);

// Execução imediata de envio de email
reveal();

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

// if (form) {
//     form.addEventListener("submit", async function(event) {
//         event.preventDefault(); // Impede o redirecionamento
//         const data = new FormData(event.target);
//         const button = document.getElementById("form-button");
        
//         button.disabled = true;
//         button.innerText = "Enviando...";

//         fetch(event.target.action, {
//             method: form.method,
//             body: data,
//             headers: {
//                 'Accept': 'application/json'
//             }
//         }).then(response => {
//             if (response.ok) {
//                 status.innerHTML = "✅ Proposta enviada! Em breve entrarei em contacto.";
//                 status.style.color = "#00ffcc"; // Verde Tech
//                 form.reset(); // Limpa os campos
//                 button.style.display = "none"; // Esconde o botão após sucesso
//             } else {
//                 response.json().then(data => {
//                     if (Object.hasOwn(data, 'errors')) {
//                         status.innerHTML = data["errors"].map(error => error["message"]).join(", ");
//                     } else {
//                         status.innerHTML = "❌ Ocorreu um erro. Tente novamente.";
//                     }
//                     status.style.color = "#ff4d4d";
//                 });
//             }
//         }).catch(error => {
//             status.innerHTML = "❌ Erro de conexão. Verifique sua internet.";
//             status.style.color = "#ff4d4d";
//         }).finally(() => {
//             if (status.innerHTML.includes("erro")) {
//                 button.disabled = false;
//                 button.innerText = "Enviar Proposta";
//             }
//         });
//     });
// }