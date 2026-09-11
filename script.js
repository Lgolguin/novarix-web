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
  // Carrusel de productos (admite 1 o varias imágenes + swipe en móvil)
  // ==========================================================================
  function initProductCarousels() {
    var carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(function (root) {
      var track = root.querySelector('[data-carousel-track]');
      var slides = track ? Array.prototype.slice.call(track.children) : [];
      var prev = root.querySelector('[data-carousel-prev]');
      var next = root.querySelector('[data-carousel-next]');
      var dotsWrap = root.querySelector('[data-carousel-dots]');
      var viewport = root.querySelector('.carousel-viewport');
      if (!track || !slides.length) return;

      var index = 0;

      function render() {
        track.style.transform = 'translateX(' + (-index * 100) + '%)';
        slides.forEach(function (slide, i) {
          slide.classList.toggle('is-active', i === index);
        });
        if (dotsWrap) {
          Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
            dot.classList.toggle('is-active', i === index);
            dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
          });
        }
      }

      function goTo(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        render();
      }

      if (dotsWrap && slides.length > 1) {
        slides.forEach(function (_, i) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'carousel-dot';
          dot.setAttribute('aria-label', 'Ir a la imagen ' + (i + 1));
          dot.addEventListener('click', function () { goTo(i); });
          dotsWrap.appendChild(dot);
        });
      }

      if (slides.length > 1) {
        if (prev) {
          prev.hidden = false;
          prev.addEventListener('click', function () { goTo(index - 1); });
        }
        if (next) {
          next.hidden = false;
          next.addEventListener('click', function () { goTo(index + 1); });
        }
      } else {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
      }

      if (viewport && slides.length > 1) {
        var startX = 0;
        viewport.addEventListener('touchstart', function (event) {
          startX = event.touches[0].clientX;
        }, { passive: true });
        viewport.addEventListener('touchend', function (event) {
          var deltaX = event.changedTouches[0].clientX - startX;
          if (Math.abs(deltaX) > 40) {
            goTo(deltaX < 0 ? index + 1 : index - 1);
          }
        }, { passive: true });
      }

      render();
    });
  }

  // ==========================================================================
  // Modal de demo (lightbox). Si hay video lo reproduce; si no, muestra aviso.
  // ==========================================================================
  function createDemoModal() {
    var root = document.createElement('div');
    root.className = 'demo-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'demo-modal-title');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="demo-modal-backdrop" data-demo-close></div>' +
      '<div class="demo-modal-dialog">' +
        '<div class="demo-modal-head">' +
          '<span class="demo-modal-chip">NOVARIX · DEMO</span>' +
          '<button type="button" class="demo-modal-close" data-demo-close aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<h2 class="demo-modal-title" id="demo-modal-title">DEMO</h2>' +
        '<div class="demo-modal-media">' +
          '<video class="demo-modal-video" controls playsinline preload="metadata" hidden></video>' +
          '<img class="demo-modal-image" alt="Vista previa del producto" hidden>' +
          '<p class="demo-modal-note" hidden></p>' +
        '</div>' +
        '<div class="demo-modal-actions">' +
          '<button type="button" class="btn btn-primary" data-demo-close>Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    var title = root.querySelector('#demo-modal-title');
    var video = root.querySelector('.demo-modal-video');
    var image = root.querySelector('.demo-modal-image');
    var note = root.querySelector('.demo-modal-note');
    var closeButton = root.querySelector('.demo-modal-close');
    var lastFocused = null;

    function setOpen(isOpen) {
      root.classList.toggle('is-open', isOpen);
      root.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function stopVideo() {
      video.pause();
      video.removeAttribute('src');
      video.load();
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
      stopVideo();
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function open(options) {
      options = options || {};
      var productTitle = options.title || '';
      var videoSrc = options.video ? String(options.video).trim() : '';
      var imageSrc = options.image ? String(options.image).trim() : '';

      lastFocused = document.activeElement;
      stopVideo();

      title.textContent = 'DEMO' + (productTitle ? ' · ' + productTitle : '');

      if (videoSrc) {
        video.hidden = false;
        image.hidden = true;
        note.hidden = true;
        video.src = videoSrc;
        video.play().catch(function () {});
      } else {
        video.hidden = true;
        if (imageSrc) {
          image.hidden = false;
          image.src = imageSrc;
        } else {
          image.hidden = true;
        }
        note.hidden = false;
        note.textContent = 'El video demo' + (productTitle ? ' de ' + productTitle : '') + ' estará disponible próximamente.';
      }

      setOpen(true);
      document.addEventListener('keydown', onKeydown);
      if (closeButton) closeButton.focus();
    }

    root.querySelectorAll('[data-demo-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    return { open: open, close: close };
  }

  function initDemoModals() {
    var triggers = document.querySelectorAll('[data-demo-open]');
    if (!triggers.length) return;
    var modal = createDemoModal();
    triggers.forEach(function (button) {
      button.addEventListener('click', function () {
        modal.open({
          title: button.getAttribute('data-demo-title') || '',
          image: button.getAttribute('data-demo-image') || '',
          video: button.getAttribute('data-demo-video') || ''
        });
      });
    });
  }

  // Información específica de STOCK, reutilizando la estructura visual del modal.
  function initStockInfoModal() {
    var triggers = document.querySelectorAll('[data-stock-info-open]');
    if (!triggers.length) return;

    var root = document.createElement('div');
    root.className = 'demo-modal stock-info-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'stock-info-modal-title');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="demo-modal-backdrop" data-stock-info-close></div>' +
      '<div class="demo-modal-dialog">' +
        '<div class="demo-modal-head">' +
          '<span class="demo-modal-chip">NOVARIX · PRODUCTO</span>' +
          '<button type="button" class="demo-modal-close" data-stock-info-close aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<h2 class="demo-modal-title" id="stock-info-modal-title">STOCK by NOVARIX</h2>' +
        '<div class="stock-info-content">' +
          '<p>Software de escritorio para gestión de inventario en Windows.</p>' +
          '<h3>Funciones</h3>' +
          '<ul class="stock-info-list">' +
            '<li>Foto del producto.</li>' +
            '<li>Nombre del producto.</li>' +
            '<li>Control de cantidad/stock.</li>' +
            '<li>Precio.</li>' +
            '<li>Interfaz tipo planilla.</li>' +
            '<li>Almacenamiento local.</li>' +
            '<li>Gestión simple, visual y rápida.</li>' +
          '</ul>' +
        '</div>' +
        '<div class="demo-modal-actions">' +
          '<button type="button" class="btn btn-primary" data-stock-info-close>Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    var closeButton = root.querySelector('.demo-modal-close');
    var lastFocused = null;

    function setOpen(isOpen) {
      root.classList.toggle('is-open', isOpen);
      root.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
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
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function open() {
      lastFocused = document.activeElement;
      setOpen(true);
      document.addEventListener('keydown', onKeydown);
      if (closeButton) closeButton.focus();
    }

    root.querySelectorAll('[data-stock-info-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    triggers.forEach(function (button) {
      button.addEventListener('click', open);
    });
  }

  // Modal de información para KAIRÓS y NOX (mismo patrón que STOCK).
  function initProductInfoModal() {
    var triggers = document.querySelectorAll('[data-product-info]');
    if (!triggers.length) return;

    var contentByProduct = {
      kairos: {
        title: 'KAIRÓS',
        chip: 'NOVARIX · PRODUCTO',
        html:
          '<p>Aplicación de organización y recordatorios para Android.</p>' +
          '<h3>Funciones</h3>' +
          '<ul class="stock-info-list">' +
            '<li>Recordatorios personalizados.</li>' +
            '<li>Categorías.</li>' +
            '<li>Repetición.</li>' +
            '<li>Notificaciones locales.</li>' +
            '<li>Organización personal.</li>' +
          '</ul>'
      },
      nox: {
        title: 'NOX',
        chip: 'NOVARIX · PRODUCTO',
        html:
          '<p>Programá el apagado de tu PC, configurá horarios y mantené el control de forma simple, segura e inteligente.</p>' +
          '<h3>Funciones</h3>' +
          '<ul class="stock-info-list">' +
            '<li>Programación horaria de apagado.</li>' +
            '<li>Cuenta regresiva.</li>' +
            '<li>Avisos previos.</li>' +
            '<li>Funcionamiento en segundo plano.</li>' +
            '<li>Interfaz simple para Windows.</li>' +
          '</ul>'
      }
    };

    var root = document.createElement('div');
    root.className = 'demo-modal product-info-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'product-info-modal-title');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="demo-modal-backdrop" data-product-info-close></div>' +
      '<div class="demo-modal-dialog">' +
        '<div class="demo-modal-head">' +
          '<span class="demo-modal-chip" id="product-info-modal-chip">NOVARIX · PRODUCTO</span>' +
          '<button type="button" class="demo-modal-close" data-product-info-close aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<h2 class="demo-modal-title" id="product-info-modal-title">PRODUCTO</h2>' +
        '<div class="stock-info-content" id="product-info-modal-body"></div>' +
        '<div class="demo-modal-actions">' +
          '<button type="button" class="btn btn-primary" data-product-info-close>Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    var title = root.querySelector('#product-info-modal-title');
    var chip = root.querySelector('#product-info-modal-chip');
    var body = root.querySelector('#product-info-modal-body');
    var closeButton = root.querySelector('.demo-modal-close');
    var lastFocused = null;

    function setOpen(isOpen) {
      root.classList.toggle('is-open', isOpen);
      root.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
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
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function open(productKey) {
      var data = contentByProduct[productKey];
      if (!data) return;
      lastFocused = document.activeElement;
      title.textContent = data.title;
      chip.textContent = data.chip;
      body.innerHTML = data.html;
      setOpen(true);
      document.addEventListener('keydown', onKeydown);
      if (closeButton) closeButton.focus();
    }

    root.querySelectorAll('[data-product-info-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    triggers.forEach(function (button) {
      button.addEventListener('click', function () {
        open(button.getAttribute('data-product-info'));
      });
    });
  }

  // ==========================================================================
  // Inicialización
  // ==========================================================================
  function init() {
    handleLogoFallback();
    initRevealOnScroll();
    initProductCarousels();
    initDemoModals();
    initStockInfoModal();
    initProductInfoModal();
    initNoxCheckout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
