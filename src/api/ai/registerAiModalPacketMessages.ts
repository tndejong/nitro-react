import { IMessageConfiguration } from '@nitrots/nitro-renderer';
import { GetCommunication } from '../nitro';
import { AiModalGetSettingsComposer } from './AiModalGetSettingsComposer';
import { AiModalSettingsEvent } from './AiModalSettingsEvent';

export const AI_MODAL_GET_SETTINGS_HEADER = 31990;
export const AI_MODAL_SETTINGS_HEADER = 31991;

let isAiModalPacketRegistered = false;

export const registerAiModalPacketMessages = () =>
{
    if(isAiModalPacketRegistered) return;

    const communication = GetCommunication();
    const connection = communication?.connection;

    if(!connection) return;

    const configuration: IMessageConfiguration = {
        events: new Map<number, Function>([
            [ AI_MODAL_SETTINGS_HEADER, AiModalSettingsEvent ]
        ]),
        composers: new Map<number, Function>([
            [ AI_MODAL_GET_SETTINGS_HEADER, AiModalGetSettingsComposer ]
        ])
    };

    connection.registerMessages(configuration);
    isAiModalPacketRegistered = true;
}
