import { IMessageEvent, MessageEvent } from '@nitrots/nitro-renderer';
import { AiModalSettingsParser } from './AiModalSettingsParser';

export class AiModalSettingsEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, AiModalSettingsParser);
    }

    public getParser(): AiModalSettingsParser
    {
        return this.parser as AiModalSettingsParser;
    }
}
