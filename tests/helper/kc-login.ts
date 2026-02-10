import { request } from '@playwright/test'

interface User {
    username: string
    password: string
}

export async function getUserBearerTokenKeycloak(user: User): Promise<string> {
    const context = await request.newContext()

    const keycloakUrl = process.env.KC_BASE_URL ?? 'https://keycloak.opencloud.test'
    const realm = 'openCloud'
    const clientId = 'web'

    const tokenResponse = await context.post(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
    form: {
        grant_type: 'password',
        client_id: clientId,
        username: user.username,
        password: user.password,
        scope: 'openid profile email'
    }
    })

    if (tokenResponse.status() !== 200) throw new Error('Token request failed')
    const data = await tokenResponse.json() as { access_token: string }

    return data.access_token
}
