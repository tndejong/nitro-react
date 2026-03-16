import { IMessageDataWrapper, IMessageParser } from '@nitrots/nitro-renderer';

export class AiModalSettingsParser implements IMessageParser
{
    private _provider: string;
    private _apiKey: string;
    private _verified: boolean;

    public flush(): boolean
    {
        this._provider = '';
        this._apiKey = '';
        this._verified = false;

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._provider = wrapper.readString();
        this._apiKey = wrapper.readString();
        this._verified = wrapper.readBoolean();

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
}
