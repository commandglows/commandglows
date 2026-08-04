import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock pour register
  http.post('http://localhost:4327/api/auth/register', async ({ request }) => {
    const body = await request.json()
    
    if (!body.email) {
      return HttpResponse.json({ error: 'missing-fields' }, { status: 400 })
    }

    if (body.email === 'test@example.com') {
      return HttpResponse.json({ error: 'user-exists' }, { status: 400 })
    }

    return HttpResponse.json({ success: true })
  }),

  // Mock pour signin
  http.post('http://localhost:4327/api/auth/signin', async ({ request }) => {
    const body = await request.json()
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return new HttpResponse(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            'Set-Cookie': 'sb-access-token=test-token; Path=/; HttpOnly'
          }
        }
      )
    }

    return HttpResponse.json({ error: 'invalid-credentials' }, { status: 401 })
  }),

  // Mock pour reset-password
  http.post('http://localhost:4327/api/auth/reset-password', async ({ request }) => {
    const body = await request.json()
    
    if (!body.email) {
      return HttpResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    return HttpResponse.json({ success: true, message: 'Password reset email sent' })
  }),

  // Mock pour signout
  http.post('http://localhost:4327/api/auth/signout', async ({ request }) => {
    const hasCookie = request.headers.get('cookie')?.includes('sb-access-token')
    
    if (!hasCookie) {
      return HttpResponse.json(
        { error: 'no-session', message: 'Aucune session active trouvée' },
        { status: 401 }
      )
    }

    return new HttpResponse(
      JSON.stringify({ success: true, message: 'Déconnexion réussie' }),
      {
        status: 200,
        headers: {
          'Set-Cookie': [
            'sb-access-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
            'sb-refresh-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
          ].join(', ')
        }
      }
    )
  })
] 