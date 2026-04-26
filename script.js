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

// Execução imediata
reveal();