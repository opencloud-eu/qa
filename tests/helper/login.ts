import { request } from '@playwright/test'
import config from '../../playwright.config'

interface User {
    username: string
    password: string
}

export async function getUserBearerToken(user: User): Promise<string> {
    const context = await request.newContext()

    // 1. Logon
    const logonResponse = await context.post(`${config.use?.baseURL}/signin/v1/identifier/_/logon`, {
        headers: {
            'Kopano-Konnect-XSRF': '1',
            Referer: config.use?.baseURL ?? '',
            'Content-Type': 'application/json'
        },
        data: {
        params: [user.username, user.password, '1'],
        hello: {
            scope: 'openid profile email',
            client_id: 'web',
            redirect_uri: `${config.use?.baseURL ?? ''}/oidc-callback.html`,
            flow: 'oidc'
        }
        }
    })

    if (logonResponse.status() !== 200) throw new Error('Logon failed')
    const continueUrl = (await logonResponse.json()).hello.continue_uri

    // 2. Authorization code
    const authorizeResponse = await context.get(continueUrl, {
        params: new URLSearchParams({
        client_id: 'web',
        prompt: 'none',
        redirect_uri: `${config.use?.baseURL ?? ''}/oidc-callback.html`,
        response_mode: 'query',
        response_type: 'code',
        scope: 'openid profile offline_access email'
        }),
        maxRedirects: 0
    })

    if (authorizeResponse.status() !== 302) throw new Error('Authorization failed')
    const location = authorizeResponse.headers()['location'] || ''
    const code = new URLSearchParams(location.split('?')[1]).get('code')
    if (!code) throw new Error('Missing auth code')

    // 3. Token exchange
    const tokenResponse = await context.post(`${config.use?.baseURL ?? ''}/konnect/v1/token`, {
        form: {
        client_id: 'web',
        code,
        redirect_uri: `${config.use?.baseURL ?? ''}/oidc-callback.html`,
        grant_type: 'authorization_code'
        }
    })

    if (tokenResponse.status() !== 200) throw new Error('Token request failed')
    const tokenData = await tokenResponse.json() as { access_token: string; refresh_token: string }

    return tokenData.access_token
}
