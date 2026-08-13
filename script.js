(function () {
  'use strict';

  // ==========================================================================
  // 1. Logo fallback
  //    Si assets/logo_novarix.png no existe o falla al cargar, ocultamos la
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

  // ==========================================================================
  // Inicialización
  // ==========================================================================
  function init() {
    handleLogoFallback();
    initRevealOnScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();