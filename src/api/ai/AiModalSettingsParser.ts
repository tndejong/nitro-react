import { IMessageDataWrapper, IMessageParser } from '@nitrots/nitro-renderer';

export class AiModalSettingsParser implements IMessageParser
{
    private _hotelToken: string;

    public flush(): boolean
    {
        this._hotelToken = '';

        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._hotelToken = wrapper.readString();

        return true;
    }

    public get hotelToken(): string
    {
        return this._hotelToken;
    }
}
