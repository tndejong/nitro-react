import { IMessageComposer } from '@nitrots/nitro-renderer';

export class AiModalGetSettingsComposer implements IMessageComposer<ConstructorParameters<typeof AiModalGetSettingsComposer>>
{
    private _data: ConstructorParameters<typeof AiModalGetSettingsComposer>;

    constructor()
    {
        this._data = [];
    }

    public getMessageArray()
    {
        return this._data;
    }

    public dispose(): void
    {
        return;
    }
}
