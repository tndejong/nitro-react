export class AiSettingsStore
{
    // Short-lived portal bearer token, minted by the emulator (via SSO) and
    // relayed through the AI settings packet. Used as Authorization: Bearer for
    // portal calls (e.g. TTS). No raw API keys are ever held client-side.
    private static _hotelToken: string = '';

    public static get hotelToken(): string
    {
        return this._hotelToken;
    }

    public static set hotelToken(value: string)
    {
        this._hotelToken = value || '';
    }
}
