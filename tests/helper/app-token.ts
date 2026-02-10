import { request } from '@playwright/test'
import config from '../../playwright.config'
import { getUserBearerToken } from './login'
import { getUserBearerTokenKeycloak } from './kc-login';

export async function createAppToken(user: { username: string; password: string }): Promise<string> {
    const useKeycloak = process.env.USE_KEYCLOAK === 'true'

    const bearer = useKeycloak ? await getUserBearerTokenKeycloak(user) : await getUserBearerToken(user)
    const context = await request.newContext({
        baseURL: config.use?.baseURL,
        extraHTTPHeaders: {
            Authorization: `Bearer ${bearer}`
        }
    })

    const response = await context.post('/auth-app/tokens?label=test-app-token&expiry=500000h')
    if (response.status() !== 200) throw new Error(`Cannot create App Token: ${response.status()}`)

    const data = await response.json()
    return data.token
}
