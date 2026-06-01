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