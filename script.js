const revealElements = () => {
  document.querySelectorAll('.reveal').forEach((element) => {
    const top = element.getBoundingClientRect().top;

    if (top < window.innerHeight - 80) {
      element.classList.add('active');
    }
  });
};

const toggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');

    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? '×' : '☰';
  });
}

if (toggle && navLinks) {
  toggle.addEventListener("click", () => {
    toggle.textContent = navLinks.classList.contains("open") ? "×" : "☰";
  });
}

const homeTabCopy = {
  gestao: {
    label: "Sistema DOZEDEV",
    title: "Gestão empresarial",
    text: "Soluções para gerir clientes, serviços, equipas, agenda, financeiro, estoque e relatórios."
  },
  crm: {
    label: "Relacionamento",
    title: "CRM",
    text: "Organização de contactos, oportunidades, histórico de atendimento e relacionamento com clientes."
  },
  erp: {
    label: "Operação integrada",
    title: "ERP",
    text: "Estruturas integradas para controlar recursos, operações, dados e processos empresariais."
  },
  saas: {
    label: "Plataforma escalável",
    title: "SaaS personalizados",
    text: "Plataformas escaláveis com múltiplas empresas, utilizadores, planos, permissões e controlo de acesso."
  }
  /* FUTURO: reativar quando a DOZEDEV voltar a oferecer solucoes de IA/chatbots.
  ,
  chatbots: {
    label: "Solução IA",
    title: "Chatbots",
    text: "Assistentes preparados para responder clientes, captar informações e direcionar atendimentos."
  },
  automacao: {
    label: "Fluxos inteligentes",
    title: "Automação",
    text: "Fluxos automáticos para reduzir tarefas repetitivas e acelerar operações."
  },
  assistentes: {
    label: "Apoio interno",
    title: "Assistentes IA",
    text: "Assistentes internos para apoiar equipas, consultar informações e executar processos."
  },
  openai: {
    label: "Integração técnica",
    title: "Integrações com OpenAI",
    text: "Integração de inteligência artificial em websites, sistemas e plataformas empresariais."
  }
  */
};

document.querySelectorAll("[data-home-tabs]").forEach((tabsRoot) => {
  const buttons = Array.from(tabsRoot.querySelectorAll("[data-tab]"));
  const panel = tabsRoot.querySelector("[data-tab-panel]");

  if (!buttons.length || !panel) return;

  const renderTab = (key) => {
    const copy = homeTabCopy[key];

    if (!copy) return;

    buttons.forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.tab === key));
    });

    const label = panel.querySelector("span");
    const title = panel.querySelector("h3");
    const text = panel.querySelector("p");

    if (label) label.textContent = copy.label;
    if (title) title.textContent = copy.title;
    if (text) text.textContent = copy.text;
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => renderTab(button.dataset.tab));

    button.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;

      event.preventDefault();

      const direction =
        event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const currentIndex = buttons.indexOf(button);
      const nextButton =
        buttons[(currentIndex + direction + buttons.length) % buttons.length];

      nextButton.focus();
      renderTab(nextButton.dataset.tab);
    });
  });
});

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(contactForm);

    const name = data.get('name');
    const email = data.get('email');
    const subject = data.get('subject');
    const message = data.get('message');

    const text = encodeURIComponent(
      `Olá, sou ${name}.\n\nE-mail: ${email}\nTipo de projeto: ${subject}\n\nMensagem:\n${message}`
    );

    const whatsappNumber = '351924116588';

    window.open(
      `https://wa.me/${whatsappNumber}?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );

    if (formStatus) {
      formStatus.textContent = 'Mensagem preparada no WhatsApp. Obrigado pelo contato!';
    }

    contactForm.reset();
  });
}

window.addEventListener('load', revealElements);
window.addEventListener('scroll', revealElements);
window.addEventListener('resize', revealElements);

revealElements();

document.querySelectorAll('.faq-item button').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const isOpen = item.classList.toggle('open');

    button.setAttribute('aria-expanded', String(isOpen));
  });
});

document.querySelectorAll('.btn').forEach((button) => {
  button.addEventListener('click', (event) => {
    const rect = button.getBoundingClientRect();

    button.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
    button.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
    button.classList.remove('ripple');
    void button.offsetWidth;
    button.classList.add('ripple');
  });
});

const countElements = document.querySelectorAll('.count-up');

if (countElements.length) {
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const target = Number(element.dataset.target || 0);
      const duration = 900;
      const start = performance.now();

      const animateCount = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = Math.round(target * eased);

        if (progress < 1) {
          requestAnimationFrame(animateCount);
        }
      };

      requestAnimationFrame(animateCount);
      observer.unobserve(element);
    });
  }, { threshold: 0.45 });

  countElements.forEach((element) => countObserver.observe(element));
}

const testimonialCards = document.querySelectorAll('.testimonial-card');

if (testimonialCards.length > 1) {
  let activeTestimonial = 0;

  setInterval(() => {
    testimonialCards[activeTestimonial].classList.remove('active');
    activeTestimonial = (activeTestimonial + 1) % testimonialCards.length;
    testimonialCards[activeTestimonial].classList.add('active');
  }, 4800);
}

function resgatarVoucher(event) {
  event.preventDefault();

  const codigo = document.getElementById("voucherCode").value.trim();
  const telefone = "351924116588";

  const mensagem = `Olá!
Tenho o voucher CLAIM-DEV-001
e gostaria de resgatar minha criação de site de 3 abas.`;

  const link = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

  window.open(link, "_blank");
}

/* ===============================
   RGPD / COOKIES
================================ */

const cookieBanner = document.getElementById("cookieBanner");
const acceptCookies = document.getElementById("acceptCookies");

if (cookieBanner && acceptCookies) {
  const cookiesAccepted = localStorage.getItem("dozedevCookiesAccepted");

  if (!cookiesAccepted) {
    cookieBanner.classList.add("show");
  }

  acceptCookies.addEventListener("click", () => {
    localStorage.setItem("dozedevCookiesAccepted", "true");
    cookieBanner.classList.remove("show");
  });
}

/* ===============================
   LEGAL MODALS
================================ */

const legalModalContent = {
  "cookies.html": {
    title: "Política de Cookies",
    eyebrow: "Privacidade digital",
    description:
      "Utilizamos cookies para melhorar a experiência no site, analisar desempenho e garantir o funcionamento correto das páginas.",
    sections: [
      {
        title: "O que são cookies?",
        text:
          "Cookies são pequenos ficheiros guardados no dispositivo quando visita um website."
      },
      {
        title: "Tipos utilizados",
        text:
          "Podemos utilizar cookies essenciais, analíticos e de melhoria de experiência."
      },
      {
        title: "Gestão de cookies",
        text:
          "Pode configurar ou bloquear cookies diretamente no navegador."
      }
    ],
    href: "cookies.html"
  },
  "termos-de-uso.html": {
    title: "Termos de Uso",
    eyebrow: "Condições de utilização",
    description:
      "Ao aceder ao website da DOZEDEV Studio, o utilizador concorda com os presentes Termos de Uso.",
    sections: [
      {
        title: "Utilização do website",
        text:
          "O website deve ser utilizado de forma legal, responsável e respeitosa."
      },
      {
        title: "Serviços",
        text:
          "A DOZEDEV Studio presta serviços de criação de websites, páginas institucionais, sistemas simples e soluções digitais personalizadas."
      },
      {
        title: "Responsabilidade",
        text:
          "A DOZEDEV Studio não se responsabiliza por falhas causadas por terceiros, serviços externos, alojamentos, domínios ou plataformas integradas."
      }
    ],
    href: "termos-de-uso.html"
  }
};

function criarLegalModal() {
  const modal = document.createElement("div");
  modal.classList.add("legal-modal");
  modal.setAttribute("aria-hidden", "true");

  const panel = document.createElement("div");
  panel.classList.add("legal-modal-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "legalModalTitle");

  const closeButton = document.createElement("button");
  closeButton.classList.add("legal-modal-close");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Fechar modal");
  closeButton.textContent = "×";

  const eyebrow = document.createElement("span");
  eyebrow.classList.add("legal-modal-eyebrow");

  const title = document.createElement("h2");
  title.id = "legalModalTitle";

  const description = document.createElement("p");
  description.classList.add("legal-modal-description");

  const list = document.createElement("div");
  list.classList.add("legal-modal-list");

  const actions = document.createElement("div");
  actions.classList.add("legal-modal-actions");

  const fullLink = document.createElement("a");
  fullLink.classList.add("legal-modal-link");
  fullLink.textContent = "Abrir página completa";

  const okButton = document.createElement("button");
  okButton.classList.add("legal-modal-ok");
  okButton.type = "button";
  okButton.textContent = "Entendi";

  actions.append(fullLink, okButton);
  panel.append(
    closeButton,
    eyebrow,
    title,
    description,
    list,
    actions
  );
  modal.appendChild(panel);
  document.body.appendChild(modal);

  return {
    modal,
    panel,
    closeButton,
    eyebrow,
    title,
    description,
    list,
    fullLink,
    okButton
  };
}

const legalModal =
  document.querySelector(".legal-modal")
    ? null
    : criarLegalModal();

function fecharLegalModal() {
  if (!legalModal) return;

  legalModal.modal.classList.remove("active");
  legalModal.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("legal-modal-open");
}

function abrirLegalModal(tipo) {
  if (!legalModal || !legalModalContent[tipo]) return;

  const content = legalModalContent[tipo];

  legalModal.eyebrow.textContent = content.eyebrow;
  legalModal.title.textContent = content.title;
  legalModal.description.textContent = content.description;
  legalModal.fullLink.href = content.href;

  legalModal.list.textContent = "";

  content.sections.forEach((section) => {
    const item = document.createElement("article");
    item.classList.add("legal-modal-item");

    const itemTitle = document.createElement("h3");
    itemTitle.textContent = section.title;

    const itemText = document.createElement("p");
    itemText.textContent = section.text;

    item.append(itemTitle, itemText);
    legalModal.list.appendChild(item);
  });

  legalModal.modal.classList.add("active");
  legalModal.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("legal-modal-open");
  legalModal.closeButton.focus();
}

if (legalModal) {
  document
    .querySelectorAll('a[href="cookies.html"], a[href="termos-de-uso.html"]')
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        const tipo = link.getAttribute("href");

        if (!legalModalContent[tipo]) return;

        event.preventDefault();
        abrirLegalModal(tipo);
      });
    });

  legalModal.closeButton.addEventListener("click", fecharLegalModal);
  legalModal.okButton.addEventListener("click", fecharLegalModal);

  legalModal.modal.addEventListener("click", (event) => {
    if (event.target === legalModal.modal) {
      fecharLegalModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      legalModal.modal.classList.contains("active")
    ) {
      fecharLegalModal();
    }
  });
}
