const revealElements = () => {
  document.querySelectorAll('.reveal').forEach((element) => {
    const top = element.getBoundingClientRect().top;
    if (top < window.innerHeight - 80) element.classList.add('active');
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

    const text = `Olá, sou ${name}.%0A%0AE-mail: ${email}%0ATipo de projeto: ${subject}%0A%0AMensagem:%0A${message}`;
    const whatsappNumber = '+351924116588';
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener,noreferrer');

    formStatus.textContent = 'Mensagem preparada no WhatsApp. Obrigado pelo contato!';
    contactForm.reset();
  });
}

window.addEventListener('load', revealElements);
window.addEventListener('scroll', revealElements);
window.addEventListener('resize', revealElements);
revealElements();
