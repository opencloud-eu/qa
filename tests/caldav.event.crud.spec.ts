import { test, expect, APIRequestContext } from '@playwright/test'
import convert from 'xml-js'
import { randomUUID } from 'crypto'
import { createAppToken } from './helper/app-token'


test('caldav create/get/delete event', async ({ request }: { request: APIRequestContext }) => {
    const appToken = await createAppToken({ username: 'mary', password: 'demo' })
    const authHeader = `Basic ${Buffer.from(`mary:${appToken}`).toString('base64')}`

    // get principal user
    const resp = await request.fetch('caldav/', { method: 'PROPFIND', headers: { Authorization: authHeader } })
    expect(resp.ok(), `Expected 207, but got ${resp.status()}\nResponse body: ${await resp.text()}`).toBeTruthy()

    const xml = JSON.parse(convert.xml2json(await resp.text(), { compact: true }))
    const principal = xml.multistatus.response.propstat.prop["current-user-principal"].href._text
    
    // def-calendar is default calendar collection for principal user
    const calenderCollection = `${principal}def-calendar/`

    // create calendar event
    const uid = randomUUID()
    const eventUrl = `${calenderCollection}${uid}.ics`
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//Apple Inc.//macOS 15.6.1//EN
BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:STANDARD
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:${uid}
DTSTART;TZID=Europe/Berlin:20310204T090000
DTEND;TZID=Europe/Berlin:20310204T100000
CREATED:20310204T121541Z
DTSTAMP:20310204T121542Z
LAST-MODIFIED:20310204T121541Z
SEQUENCE:0
SUMMARY:test event
DESCRIPTION:this is a test event created by playwright
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`

    const createEvent = await request.put(eventUrl, {
        headers: { 'Content-Type': 'text/calendar; charset=utf-8', Authorization: authHeader },
        data: ics,
    })
    expect(createEvent.ok(), `Expected 201, but got ${createEvent.status()}\nResponse body: ${await createEvent.text()}`).toBeTruthy()
    
    // get calendar events
    const getEvents = await request.get(eventUrl, { headers: { Authorization: authHeader } })
    expect(getEvents.ok(), `Expected 200, but got ${getEvents.status()}\nResponse body: ${await getEvents.text()}`).toBeTruthy()

    // delete calendar event
    const deleteEvent = await request.delete(eventUrl, { headers: { Authorization: authHeader } })
    expect(deleteEvent.ok(), `Expected 204, but got ${deleteEvent.status()}\nResponse body: ${await deleteEvent.text()}`).toBeTruthy()
})
