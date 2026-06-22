import { AiSettingsStore } from './AiSettingsStore';
import { GetConfiguration } from '../nitro';

// Single client for all portal calls made from the in-hotel Nitro client.
// The portal base URL is read from renderer-config.json (portal.public.url)
// which is set at container start via HABBO_PORTAL_PUBLIC_URL, so the correct
// value is used in both local dev (http://127.0.0.1:3090) and production
// (https://portal.thepixeloffice.ai). No CORS issues since both hotel and
// portal run under the same (or your own) Coolify reverse proxy.
export class HotelPortalClient
{
    private static portalUrl(): string
    {
        return GetConfiguration('portal.public.url', 'http://localhost:3090');
    }

    private static authHeaders(): Record<string, string>
    {
        const token = AiSettingsStore.hotelToken;
        return token ? { 'Authorization': `Bearer ${ token }` } : {};
    }

    public static get hasToken(): boolean
    {
        return !!AiSettingsStore.hotelToken;
    }

    // Synthesize speech for a bot message. Returns the audio blob, or null on failure.
    public static async tts(text: string, voiceId?: string): Promise<Blob | null>
    {
        if(!this.hasToken)
        {
            console.log('[TTS] HotelPortalClient.tts called without a hotel token — skipping');
            return null;
        }

        const body: { text: string, voice_id?: string } = { text };
        if(voiceId) body.voice_id = voiceId;

        const url = `${ this.portalUrl() }/api/chat/tts/hotel`;
        console.log(`[TTS] POST ${ url } textLen=${ text.length } voiceId=${ voiceId || '(portal default)' }`);

        try
        {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
                body: JSON.stringify(body)
            });

            console.log(`[TTS] tts/hotel response status=${ res.status }`);

            if(!res.ok)
            {
                const errBody = await res.text().catch(() => '');
                console.log(`[TTS] tts/hotel FAILED status=${ res.status } body=${ errBody }`);
                return null;
            }

            return res.blob();
        }
        catch(err)
        {
            console.log('[TTS] tts/hotel fetch error', err);
            return null;
        }
    }

    // Signal the portal to advance a bot-to-bot duet turn for the current user.
    public static aiNext(): Promise<Response>
    {
        return fetch(`${ this.portalUrl() }/api/chat/ai_next/hotel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
            body: '{}'
        });
    }
}
