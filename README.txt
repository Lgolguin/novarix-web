NOVARIX — Carpeta de recursos (assets)
=======================================

Esta carpeta contiene los recursos de la web de NOVARIX.

Logo oficial
------------
El logo oficial de NOVARIX ya se encuentra en esta carpeta con el nombre:

    logo_novarix.png

Es decir, la ruta completa es:

    assets/logo_novarix.png

Este archivo se utiliza en el header (y el footer) de la web. La imagen se
muestra conservando su proporción (aspect-ratio) y se adapta a escritorio y
móvil.

Si el logo llegara a faltar o no pudiera cargar, la web mostrará
automáticamente una versión de respaldo con el texto "NOVARIX" para no
romper el diseño. Ese comportamiento lo gestiona script.js de forma segura.

Recomendaciones
---------------
- Formato: PNG con fondo transparente (ideal para el header oscuro).
- Mantener la transparencia para una integración limpia sobre el fondo oscuro.

Nota
----
No incluyas archivos pesados o innecesarios en esta carpeta para mantener
la web rápida y compatible con GitHub Pages.