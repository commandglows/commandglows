// Initialisation des modales
function initModals() {
  // Boutons d'ouverture
  document.querySelectorAll('[data-modal-toggle]').forEach((button) => {
    const modalId = button.getAttribute('data-modal-toggle');
    if (!modalId) return;

    const modal = document.getElementById(modalId);
    if (!modal) return;

    button.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  });

  // Boutons de fermeture
  document.querySelectorAll('[data-modal-close]').forEach((button) => {
    const modalId = button.getAttribute('data-modal-close');
    if (!modalId) return;

    const modal = document.getElementById(modalId);
    if (!modal) return;

    button.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  // Fermeture en cliquant sur l'arrière-plan
  document.querySelectorAll('.hs-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Gestion des formulaires d'authentification
  initAuthForms();
}

function initAuthForms() {
  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm instanceof HTMLFormElement) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.text();
          showFormError('login-email-error', error);
          return;
        }

        // Redirection gérée par le serveur
        window.location.href = '/dashboard';
      } catch (err) {
        showFormError('login-email-error', 'Erreur de connexion');
      }
    });
  }

  // Register Form
  const registerForm = document.getElementById('register-form');
  if (registerForm instanceof HTMLFormElement) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      
      // Validation côté client
      const password = formData.get('password')?.toString();
      const confirmPassword = formData.get('confirm-password')?.toString();
      
      if (password !== confirmPassword) {
        showFormError('register-email-error', 'Les mots de passe ne correspondent pas');
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.text();
          showFormError('register-email-error', error);
          return;
        }

        window.location.href = '/dashboard';
      } catch (err) {
        showFormError('register-email-error', 'Erreur lors de l\'inscription');
      }
    });
  }

  // Recover Form
  const recoverForm = document.getElementById('recover-form');
  if (recoverForm instanceof HTMLFormElement) {
    recoverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(recoverForm);

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.text();
          showFormError('recover-email-error', error);
          return;
        }

        showFormSuccess('recover-email-error', 'Vérifiez votre email pour réinitialiser votre mot de passe');
      } catch (err) {
        showFormError('recover-email-error', 'Erreur lors de la réinitialisation');
      }
    });
  }

  // Google Auth
  const googleButtons = document.querySelectorAll('[id^="google-"]');
  googleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ provider: 'google' })
        });

        if (!response.ok) {
          throw new Error('Erreur de connexion Google');
        }

        const data = await response.json();
        window.location.href = data.url; // URL de redirection OAuth
      } catch (err) {
        const errorId = button.id === 'google-signin' ? 'login-email-error' : 'register-email-error';
        showFormError(errorId, 'Erreur de connexion avec Google');
      }
    });
  });
}

// Utilitaires pour la gestion des erreurs/succès
function showFormError(elementId: string, message: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = 'red';
  }
}

function showFormSuccess(elementId: string, message: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = 'green';
  }
}

// Initialiser les modales au chargement de la page et après chaque navigation
document.addEventListener('astro:page-load', initModals); 