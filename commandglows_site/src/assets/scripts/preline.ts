import 'preline';
import '@preline/collapse';
import '@preline/dropdown';
import '@preline/overlay';

declare global {
  interface Window {
    HSCollapse: any;
    HSDropdown: any;
    HSOverlay: any;
  }
}

function initPreline() {
  // Initialize collapse components (hamburger menu)
  if (typeof window.HSCollapse !== 'undefined') {
    window.HSCollapse.autoInit();
  }

  // Initialize dropdowns
  if (typeof window.HSDropdown !== 'undefined') {
    window.HSDropdown.autoInit();
  }

  // Initialize overlays (modals)
  if (typeof window.HSOverlay !== 'undefined') {
    window.HSOverlay.autoInit();
  }
}

// Initial load
document.addEventListener('DOMContentLoaded', initPreline);

// After each navigation
document.addEventListener('astro:page-load', initPreline);

// Reinitialize after each page transition
document.addEventListener('astro:after-swap', initPreline); 