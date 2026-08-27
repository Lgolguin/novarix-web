(function () {
  'use strict';

  // ==========================================================================
  // 1. Logo fallback
  //    Si logo_novarix.png no existe o falla al cargar, ocultamos la
  //    <img> y mostramos el texto "NOVARIX". Así la página nunca se rompe.
  // ==========================================================================
  function showFallback(img) {
    img.style.display = 'none';
    var brand = img.closest('.brand');
    if (brand) {
      brand.classList.add('brand-fallback-active');
    }
  }

  function handleLogoFallback() {
    var imgs = document.querySelectorAll('img[data-logo-fallback]');
    if (!imgs.length) return;

    imgs.forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) {
        showFallback(img);
      } else {
        img.addEventListener('error', function () {
          showFallback(img);
        });
      }
    });
  }

  // ==========================================================================
  // 2. Aparición sutil al hacer scroll (respeta prefers-reduced-motion)
  // ==========================================================================
  function initRevealOnScroll() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Modal propio NOVARIX para solicitar el email (sustituye a window.prompt).
  function createNoxModal() {
    var root = document.createElement('div');
    root.className = 'nox-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'nox-modal-title');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="nox-modal-backdrop" data-nox-close></div>' +
      '<div class="nox-modal-dialog">' +
        '<div class="nox-modal-head">' +
          '<span class="nox-modal-chip">NOVARIX</span>' +
          '<button type="button" class="nox-modal-close" data-nox-close aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<h2 class="nox-modal-title" id="nox-modal-title">COMPRAR NOX</h2>' +
        '<p class="nox-modal-text">Ingresá el email donde querés recibir tu licencia y el enlace de descarga.</p>' +
        '<form class="nox-modal-form" novalidate>' +
          '<label class="nox-modal-label" for="nox-email">Email</label>' +
          '<input class="nox-modal-input" id="nox-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" required>' +
          '<p class="nox-modal-error" id="nox-modal-error" role="alert" hidden></p>' +
          '<div class="nox-modal-actions">' +
            '<button type="button" class="btn btn-secondary nox-modal-cancel" data-nox-close>CANCELAR</button>' +
            '<button type="submit" class="btn btn-primary nox-modal-confirm">CONTINUAR AL PAGO</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(root);

    var form = root.querySelector('.nox-modal-form');
    var emailInput = root.querySelector('.nox-modal-input');
    var error = root.querySelector('.nox-modal-error');
    var lastFocused = null;
    var onConfirm = null;

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.focus();
    }

    function setOpen(open) {
      root.classList.toggle('is-open', open);
      root.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }

    function close() {
      if (!root.classList.contains('is-open')) return;
      setOpen(false);
      document.removeEventListener('keydown', onKeydown);
      onConfirm = null;
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function open(callback) {
      onConfirm = callback;
      lastFocused = document.activeElement;
      emailInput.value = '';
      emailInput.removeAttribute('aria-invalid');
      error.textContent = '';
      error.hidden = true;
      setOpen(true);
      document.addEventListener('keydown', onKeydown);
      emailInput.focus();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = emailInput.value.trim();
      if (!email) {
        showError('Ingresá tu email para continuar.');
        return;
      }
      if (!isValidEmail(email)) {
        showError('Ingresá un email válido (ej. nombre@dominio.com).');
        return;
      }
      var callback = onConfirm;
      close();
      if (callback) callback(email);
    });

    root.querySelectorAll('[data-nox-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    return { open: open, close: close };
  }

  // Compra de NOX: el precio válido siempre lo determina el backend.
  function initNoxCheckout() {
    var button = document.getElementById('nox-buy-button');
    var status = document.getElementById('nox-sale-status');
    if (!button || !status) return;
    var config = window.NOVARIX_NOX_SALES || {};
    var apiBaseUrl = String(config.apiBaseUrl || '').replace(/\/$/, '');
    var enabled = config.checkoutEnabled === true && /^https:\/\//i.test(apiBaseUrl);
    button.disabled = !enabled;
    status.textContent = enabled ? 'LICENCIA PARA 1 PC' : 'VENTAS TODAVÍA DESACTIVADAS';
    if (!enabled) return;

    var modal = createNoxModal();

    function startNoxCheckout(email) {
      button.disabled = true;
      status.textContent = 'INICIANDO CHECKOUT SEGURO…';
      fetch(apiBaseUrl + '/api/checkout/nox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('checkout_unavailable');
          return response.json();
        })
        .then(function (payload) {
          if (!payload.payment_url) throw new Error('invalid_response');
          window.location.assign(payload.payment_url);
        })
        .catch(function () {
          button.disabled = false;
          status.textContent = 'NO PUDIMOS INICIAR EL PAGO. INTENTÁ MÁS TARDE.';
        });
    }

    button.addEventListener('click', function () {
      modal.open(startNoxCheckout);
    });
  }

  // ==========================================================================
  // Inicialización
  // ==========================================================================
  function init() {
    handleLogoFallback();
    initRevealOnScroll();
    initNoxCheckout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
