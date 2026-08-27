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

    button.addEventListener('click', function () {
      var email = window.prompt('Ingresá el email donde querés recibir la licencia y la descarga:');
      if (!email) return;
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
