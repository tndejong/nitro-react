export class AiSettingsStore
{
    private static _elevenlabsKey: string = '';
    private static _elevenlabsVoiceId: string = '';

    public static get elevenlabsKey(): string
    {
        return this._elevenlabsKey;
    }

    public static set elevenlabsKey(value: string)
    {
        this._elevenlabsKey = value;
    }

    public static get elevenlabsVoiceId(): string
    {
        return this._elevenlabsVoiceId || 'EXAVITQu4vr4xnSDxMaL';
    }

    public static set elevenlabsVoiceId(value: string)
    {
        this._elevenlabsVoiceId = value;
    }
}
