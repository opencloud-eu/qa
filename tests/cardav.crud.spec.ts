import { test, expect, APIRequestContext } from '@playwright/test'
import convert from 'xml-js'
import { randomUUID } from 'crypto'
import { createAppToken } from './helper/app-token'


test('cardav create/get/delete contact', async ({ request }: { request: APIRequestContext }) => {
    const appToken = await createAppToken({ username: 'alan', password: 'demo' })
    const authHeader = `Basic ${Buffer.from(`alan:${appToken}`).toString('base64')}`

    // get principal user
    const resp = await request.fetch('caldav/', { method: 'PROPFIND', headers: { Authorization: authHeader } })
    expect(resp.ok(), `Expected 207, but got ${resp.status()}\nResponse body: ${await resp.text()}`).toBeTruthy()

    const xml = JSON.parse(convert.xml2json(await resp.text(), { compact: true }))
    const principal = xml.multistatus.response.propstat.prop["current-user-principal"].href._text
    
    // def-addressbook is default address book collection for principal user
    // we create new address book
    const uid = randomUUID()
    const addressBookCollection = `${principal}opencloud-book-${uid}/`
    const createBook = await request.fetch(`${addressBookCollection}`, {
        method: 'MKCOL',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
        },
        data: `<?xml version="1.0"?>
            <D:mkcol xmlns:D="DAV:" xmlns:CR="urn:ietf:params:xml:ns:carddav">
            <D:set>
                <D:prop>
                <D:resourcetype>
                    <D:collection/>
                    <CR:addressbook/>
                </D:resourcetype>
                <D:displayname>OpenCloud Book</D:displayname>
                </D:prop>
            </D:set>
            </D:mkcol>`
    })
    expect(createBook.ok(), `Expected 201, but got ${createBook.status()}\nResponse body: ${await createBook.text()}`).toBeTruthy()

    // create address book contact
    const contactUrl = `${addressBookCollection}${uid}.vcf`

const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//macOS 15.6.1//EN
UID:${uid}
FN:Opencloud
N:;;;;
ORG:Opencloud
EMAIL;TYPE=INTERNET,HOME,pref:mail@opencloud.eu
TEL;TYPE=CELL,VOICE,pref:+49 30 40 50 51 - 350
ADR;TYPE=WORK,pref:;;Schwedter Str. 9a;Berlin;;10119;Germany
X-ABSHOWAS:COMPANY
REV:2026-02-11T13:33:49Z
END:VCARD`

    const res = await request.put(contactUrl, {
    headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        Authorization: authHeader,
    },
    data: vcard,
    })
    expect(res.ok(), `PUT failed ${res.status()}\n${await res.text()}`).toBeTruthy()

    // get contact
    const getContact = await request.get(contactUrl, { headers: { Authorization: authHeader } })
    expect(getContact.ok(), `Expected 200, but got ${getContact.status()}\nResponse body: ${await getContact.text()}`).toBeTruthy()

    // delete contact
    const deleteContact = await request.delete(contactUrl, { headers: { Authorization: authHeader } })
    expect(deleteContact.ok(), `Expected 204, but got ${deleteContact.status()}\nResponse body: ${await deleteContact.text()}`).toBeTruthy()
})
