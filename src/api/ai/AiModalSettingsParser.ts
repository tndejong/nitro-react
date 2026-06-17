import { IMessageDataWrapper, IMessageParser } from '@nitrots/nitro-renderer';

export class AiModalSettingsParser implements IMessageParser
{
    private _provider: string;
    private _apiKey: string;
    private _verified: boolean;
    private _elevenlabsKey: string;
    private _elevenlabsVoiceId: string;

    public flush(): boolean
    {
        this._provider = '';
        this._apiKey = '';
        this._verified = false;
        this._elevenlabsKey = '';
        this._elevenlabsVoiceId = '';

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._provider = wrapper.readString();
        this._apiKey = wrapper.readString();
        this._verified = wrapper.readBoolean();
        this._elevenlabsKey = wrapper.readString();
        this._elevenlabsVoiceId = wrapper.readString();

        return true;
    }

    public get provider(): string
    {
        return this._provider;
    }

    public get apiKey(): string
    {
        return this._apiKey;
    }

    public get verified(): boolean
    {
        return this._verified;
    }

    public get elevenlabsKey(): string
    {
        return this._elevenlabsKey;
    }

    public get elevenlabsVoiceId(): string
    {
        return this._elevenlabsVoiceId;
    }
}
