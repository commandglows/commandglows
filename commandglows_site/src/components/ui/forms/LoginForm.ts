// Fonction pour gérer le formulaire de connexion
export function setupLoginForm() {
	const form = document.getElementById('login-form')
	const errorElement = document.getElementById('login-email-error')
	const lang = document.documentElement.lang

	function showError(message: string) {
		if (errorElement) {
			errorElement.textContent = message
			errorElement.style.display = 'block'
		}
	}

	if (form instanceof HTMLFormElement) {
		form.addEventListener('submit', async (e) => {
			e.preventDefault()

			try {
				const response = await fetch(form.action, {
					method: 'POST',
					body: new FormData(form),
					headers: {
						Accept: 'application/json',
					},
				})

				const data = await response.json()

				if (!response.ok) {
					throw new Error(data.message || 'Erreur de connexion')
				}

				// Redirection après connexion réussie
				window.location.href = data.redirectUrl || '/dashboard'
			} catch (err) {
				showError(
					lang === 'fr'
						? 'Email ou mot de passe incorrect'
						: 'Invalid email or password'
				)
			}
		})
	}

	// Google Sign In
	const googleBtn = document.getElementById('google-signin')
	if (googleBtn) {
		googleBtn.addEventListener('click', async () => {
			try {
				const response = await fetch('/api/auth/signin', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({ provider: 'google' }),
				})

				const data = await response.json()

				if (!response.ok) {
					throw new Error(data.message || 'Erreur de connexion Google')
				}

				// Redirection vers l'URL OAuth de Google
				window.location.href = data.url
			} catch (err) {
				showError(
					lang === 'fr'
						? 'Erreur de connexion avec Google'
						: 'Error signing in with Google'
				)
			}
		})
	}
} 