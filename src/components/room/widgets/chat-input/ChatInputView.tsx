import { HabboClubLevelEnum, ILinkEventTracker, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddEventLinkTracker, AiModalGetSettingsComposer, AiModalSettingsEvent, ChatMessageTypeEnum, GetClubMemberLevel, GetCommunication, GetConfiguration, GetSessionDataManager, LocalizeText, registerAiModalPacketMessages, RemoveLinkEventTracker, RoomWidgetUpdateChatInputContentEvent, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../../common';
import { useChatInputWidget, useRoom, useSessionInfo, useUiEvent } from '../../../../hooks';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';

export const ChatInputView: FC<{}> = props =>
{
    const [ chatValue, setChatValue ] = useState<string>('');
    const [ isAiPanelVisible, setIsAiPanelVisible ] = useState<boolean>(false);
    const [ aiProvider, setAiProvider ] = useState<string>('anthropic');
    const [ aiApiKey, setAiApiKey ] = useState<string>('');
    const [ aiBotName, setAiBotName ] = useState<string>('Aria');
    const [ aiFigureType, setAiFigureType ] = useState<string>('agent');
    const [ aiSpawnX, setAiSpawnX ] = useState<string>('');
    const [ aiSpawnY, setAiSpawnY ] = useState<string>('');
    const [ aiPersona, setAiPersona ] = useState<string>('Friendly office assistant helping guests in this room');
    const [ aiRemoveName, setAiRemoveName ] = useState<string>('Aria');
    const [ aiDuetBotA, setAiDuetBotA ] = useState<string>('Bob');
    const [ aiDuetBotB, setAiDuetBotB ] = useState<string>('Bas');
    const [ aiDuetTopic, setAiDuetTopic ] = useState<string>('Heb een kort gesprek over muizen en stel elkaar vragen.');
    const [ aiDuetTurns, setAiDuetTurns ] = useState<string>('8');
    const { chatStyleId = 0, updateChatStyleId = null } = useSessionInfo();
    const { selectedUsername = '', floodBlocked = false, floodBlockedSeconds = 0, setIsTyping = null, setIsIdle = null, sendChat = null } = useChatInputWidget();
    const { roomSession = null } = useRoom();
    const inputRef = useRef<HTMLInputElement>();

    const chatModeIdWhisper = useMemo(() => LocalizeText('widgets.chatinput.mode.whisper'), []);
    const chatModeIdShout = useMemo(() => LocalizeText('widgets.chatinput.mode.shout'), []);
    const chatModeIdSpeak = useMemo(() => LocalizeText('widgets.chatinput.mode.speak'), []);
    const maxChatLength = useMemo(() => GetConfiguration<number>('chat.input.maxlength', 100), []);
    const maxInputLength = useMemo(() => 512, []);

    const anotherInputHasFocus = useCallback(() =>
    {
        const activeElement = document.activeElement;

        if(!activeElement) return false;

        if(inputRef && (inputRef.current === activeElement)) return false;

        if(!(activeElement instanceof HTMLInputElement) && !(activeElement instanceof HTMLTextAreaElement)) return false;

        return true;
    }, [ inputRef ]);

    const setInputFocus = useCallback(() =>
    {
        inputRef.current.focus();

        inputRef.current.setSelectionRange((inputRef.current.value.length * 2), (inputRef.current.value.length * 2));
    }, [ inputRef ]);

    const checkSpecialKeywordForInput = useCallback(() =>
    {
        setChatValue(prevValue =>
        {
            if((prevValue !== chatModeIdWhisper) || !selectedUsername.length) return prevValue;

            return (`${ prevValue } ${ selectedUsername }`);
        });
    }, [ selectedUsername, chatModeIdWhisper ]);

    const sendChatValue = useCallback((value: string, shiftKey: boolean = false) =>
    {
        if(!value || (value === '')) return;

        let chatType = (shiftKey ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT);
        let text = value;

        if(text.trim().toLowerCase() === ':ai')
        {
            setChatValue('');
            setIsAiPanelVisible(true);
            setIsTyping(false);
            setIsIdle(false);
            return;
        }

        const parts = text.split(' ');

        let recipientName = '';
        let append = '';

        switch(parts[0])
        {
            case chatModeIdWhisper:
                chatType = ChatMessageTypeEnum.CHAT_WHISPER;
                recipientName = parts[1];
                append = (chatModeIdWhisper + ' ' + recipientName + ' ');

                parts.shift();
                parts.shift();
                break;
            case chatModeIdShout:
                chatType = ChatMessageTypeEnum.CHAT_SHOUT;

                parts.shift();
                break;
            case chatModeIdSpeak:
                chatType = ChatMessageTypeEnum.CHAT_DEFAULT;

                parts.shift();
                break;
        }

        text = parts.join(' ');

        setIsTyping(false);
        setIsIdle(false);

        if(text.startsWith(':') || text.length <= maxChatLength)
        {
            if(/%CC%/g.test(encodeURIComponent(text)))
            {
                setChatValue('');
            }
            else
            {
                setChatValue('');
                sendChat(text, chatType, recipientName, chatStyleId);
            }
        }

        setChatValue(append);
    }, [ chatModeIdWhisper, chatModeIdShout, chatModeIdSpeak, maxChatLength, chatStyleId, setIsTyping, setIsIdle, sendChat ]);

    const sendRawCommand = useCallback((command: string) =>
    {
        if(!command || !command.length) return;

        setIsTyping(false);
        setIsIdle(false);
        setChatValue('');
        sendChat(command, ChatMessageTypeEnum.CHAT_DEFAULT, '', chatStyleId);
    }, [ chatStyleId, setIsIdle, setIsTyping, sendChat ]);

    const submitSetAiKey = useCallback(() =>
    {
        const key = aiApiKey.trim();
        const provider = aiProvider.trim().toLowerCase();

        if(!key.length) return;

        sendRawCommand(`:set_ai_key ${ key } ${ provider || 'anthropic' }`);
    }, [ aiApiKey, aiProvider, sendRawCommand ]);

    const submitSetupAgent = useCallback(() =>
    {
        const name = aiBotName.trim();
        const figureType = aiFigureType.trim().toLowerCase();
        const spawnX = aiSpawnX.trim();
        const spawnY = aiSpawnY.trim();
        const persona = aiPersona.trim();

        if(!name.length || !persona.length) return;

        let command = `:setup_agent ${ name }`;

        if(figureType.length) command += ` type:${ figureType }`;
        if(spawnX.length) command += ` x:${ spawnX }`;
        if(spawnY.length) command += ` y:${ spawnY }`;

        command += ` ${ persona }`;

        sendRawCommand(command);
    }, [ aiBotName, aiFigureType, aiSpawnX, aiSpawnY, aiPersona, sendRawCommand ]);

    const submitRemoveAgent = useCallback((removeAll: boolean) =>
    {
        if(removeAll)
        {
            sendRawCommand(':remove_agent all');
            return;
        }

        const target = aiRemoveName.trim();

        if(!target.length) return;

        sendRawCommand(`:remove_agent ${ target }`);
    }, [ aiRemoveName, sendRawCommand ]);

    const submitStartAiDuet = useCallback(() =>
    {
        const botA = aiDuetBotA.trim();
        const botB = aiDuetBotB.trim();
        const topic = aiDuetTopic.trim();
        const turns = aiDuetTurns.trim();

        if(!botA.length || !botB.length || !topic.length) return;

        if(turns.length) sendRawCommand(`:ai_duet ${ botA } ${ botB } turns:${ turns } ${ topic }`);
        else sendRawCommand(`:ai_duet ${ botA } ${ botB } ${ topic }`);
    }, [ aiDuetBotA, aiDuetBotB, aiDuetTopic, aiDuetTurns, sendRawCommand ]);

    const submitStopAiDuet = useCallback(() =>
    {
        sendRawCommand(':ai_stop');
    }, [ sendRawCommand ]);

    const submitLoadAiKey = useCallback(() =>
    {
        registerAiModalPacketMessages();
        SendMessageComposer(new AiModalGetSettingsComposer());
    }, []);

    const updateChatInput = useCallback((value: string) =>
    {
        if(!value || !value.length)
        {
            setIsTyping(false);
        }
        else
        {
            setIsTyping(true);
            setIsIdle(true);
        }

        setChatValue(value);
    }, [ setIsTyping, setIsIdle ]);

    const onKeyDownEvent = useCallback((event: KeyboardEvent) =>
    {
        if(floodBlocked || !inputRef.current || anotherInputHasFocus()) return;

        if(document.activeElement !== inputRef.current) setInputFocus();

        const value = (event.target as HTMLInputElement).value;

        switch(event.key)
        {
            case ' ':
            case 'Space':
                checkSpecialKeywordForInput();
                return;
            case 'NumpadEnter':
            case 'Enter':
                sendChatValue(value, event.shiftKey);
                return;
            case 'Backspace':
                if(value)
                {
                    const parts = value.split(' ');

                    if((parts[0] === chatModeIdWhisper) && (parts.length === 3) && (parts[2] === ''))
                    {
                        setChatValue('');
                    }
                }
                return;
        }

    }, [ floodBlocked, inputRef, chatModeIdWhisper, anotherInputHasFocus, setInputFocus, checkSpecialKeywordForInput, sendChatValue ]);

    useUiEvent<RoomWidgetUpdateChatInputContentEvent>(RoomWidgetUpdateChatInputContentEvent.CHAT_INPUT_CONTENT, event =>
    {
        switch(event.chatMode)
        {
            case RoomWidgetUpdateChatInputContentEvent.WHISPER: {
                setChatValue(`${ chatModeIdWhisper } ${ event.userName } `);
                return;
            }
            case RoomWidgetUpdateChatInputContentEvent.SHOUT:
                return;
        }
    });

    const chatStyleIds = useMemo(() =>
    {
        let styleIds: number[] = [];

        const styles = GetConfiguration<{ styleId: number, minRank: number, isSystemStyle: boolean, isHcOnly: boolean, isAmbassadorOnly: boolean }[]>('chat.styles');

        for(const style of styles)
        {
            if(!style) continue;

            if(style.minRank > 0)
            {
                if(GetSessionDataManager().hasSecurity(style.minRank)) styleIds.push(style.styleId);

                continue;
            }

            if(style.isSystemStyle)
            {
                if(GetSessionDataManager().hasSecurity(RoomControllerLevel.MODERATOR))
                {
                    styleIds.push(style.styleId);

                    continue;
                }
            }

            if(GetConfiguration<number[]>('chat.styles.disabled').indexOf(style.styleId) >= 0) continue;

            if(style.isHcOnly && (GetClubMemberLevel() >= HabboClubLevelEnum.CLUB))
            {
                styleIds.push(style.styleId);

                continue;
            }

            if(style.isAmbassadorOnly && GetSessionDataManager().isAmbassador)
            {
                styleIds.push(style.styleId);

                continue;
            }

            if(!style.isHcOnly && !style.isAmbassadorOnly) styleIds.push(style.styleId);
        }

        return styleIds;
    }, []);

    useEffect(() =>
    {
        registerAiModalPacketMessages();

        const communication = GetCommunication();

        if(!communication) return;

        const event = new AiModalSettingsEvent((messageEvent: AiModalSettingsEvent) =>
        {
            const parser = messageEvent.getParser();

            setAiProvider((parser.provider || '').trim() || 'anthropic');
            setAiApiKey(parser.apiKey || '');
        });

        communication.registerMessageEvent(event);

        return () => communication.removeMessageEvent(event);
    }, []);

    useEffect(() =>
    {
        if(!isAiPanelVisible) return;

        submitLoadAiKey();
    }, [ isAiPanelVisible, submitLoadAiKey ]);

    useEffect(() =>
    {
        document.body.addEventListener('keydown', onKeyDownEvent);

        return () =>
        {
            document.body.removeEventListener('keydown', onKeyDownEvent);
        }
    }, [ onKeyDownEvent ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'ai-tools/',
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'show':
                        setIsAiPanelVisible(true);
                        return;
                    case 'hide':
                        setIsAiPanelVisible(false);
                        return;
                    case 'toggle':
                        setIsAiPanelVisible(prevValue => !prevValue);
                        return;
                }
            }
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() =>
    {
        if(!inputRef.current) return;

        inputRef.current.parentElement.dataset.value = chatValue;
    }, [ chatValue ]);

    if(!roomSession || roomSession.isSpectator) return null;

    const chatInputContainer = document.getElementById('toolbar-chat-input-container');

    if(!chatInputContainer) return null;

    return (
        <>
            { createPortal(
                <div className="nitro-chat-input-container">
                    <div className="input-sizer align-items-center">
                        { !floodBlocked &&
                        <input ref={ inputRef } type="text" className="chat-input" placeholder={ LocalizeText('widgets.chatinput.default') } value={ chatValue } maxLength={ maxInputLength } onChange={ event => updateChatInput(event.target.value) } onMouseDown={ event => setInputFocus() } /> }
                        { floodBlocked &&
                        <Text variant="danger">{ LocalizeText('chat.input.alert.flood', [ 'time' ], [ floodBlockedSeconds.toString() ]) } </Text> }
                    </div>
                    <ChatInputStyleSelectorView chatStyleId={ chatStyleId } chatStyleIds={ chatStyleIds } selectChatStyleId={ updateChatStyleId } />
                </div>,
                chatInputContainer)
            }
            { isAiPanelVisible && createPortal(
                <NitroCardView className="nitro-ai-manager-widget" theme="primary-slim" uniqueKey="nitro-ai-manager-widget">
                    <NitroCardHeaderView headerText="AI Agent Manager" onCloseClick={ () => setIsAiPanelVisible(false) } />
                    <NitroCardContentView className="text-black">
                        <Column gap={ 2 }>
                            <Text bold>Set AI Key</Text>
                            <label className="small">Provider (anthropic/openai)</label>
                            <input className="form-control form-control-sm" value={ aiProvider } onChange={ event => setAiProvider(event.target.value) } />
                            <label className="small">API key</label>
                            <input className="form-control form-control-sm" value={ aiApiKey } onChange={ event => setAiApiKey(event.target.value) } />
                            <Button variant="success" onClick={ submitSetAiKey }>Set API Key</Button>

                            <hr className="my-1" />

                            <Text bold>Create Agent</Text>
                            <label className="small">Bot name</label>
                            <input className="form-control form-control-sm" value={ aiBotName } onChange={ event => setAiBotName(event.target.value) } />
                            <label className="small">Figure type</label>
                            <select className="form-control form-control-sm" value={ aiFigureType } onChange={ event => setAiFigureType(event.target.value) }>
                                <option value="default">default</option>
                                <option value="citizen">citizen</option>
                                <option value="agent">agent</option>
                                <option value="bouncer">bouncer</option>
                                <option value="m-employee">m-employee</option>
                            </select>
                            <label className="small">Spawn coordinates (optional)</label>
                            <Flex gap={ 2 }>
                                <input className="form-control form-control-sm" placeholder="x" value={ aiSpawnX } onChange={ event => setAiSpawnX(event.target.value) } />
                                <input className="form-control form-control-sm" placeholder="y" value={ aiSpawnY } onChange={ event => setAiSpawnY(event.target.value) } />
                            </Flex>
                            <label className="small">Persona</label>
                            <textarea className="form-control form-control-sm" rows={ 3 } value={ aiPersona } onChange={ event => setAiPersona(event.target.value) } />
                            <Button variant="primary" onClick={ submitSetupAgent }>Create Agent</Button>

                            <hr className="my-1" />

                            <Text bold>Remove Agent</Text>
                            <label className="small">Bot name</label>
                            <input className="form-control form-control-sm" value={ aiRemoveName } onChange={ event => setAiRemoveName(event.target.value) } />
                            <Flex gap={ 2 }>
                                <Button variant="danger" onClick={ () => submitRemoveAgent(false) }>Remove One</Button>
                                <Button variant="danger" onClick={ () => submitRemoveAgent(true) }>Remove All</Button>
                            </Flex>

                            <hr className="my-1" />

                            <Text bold>Bot-to-Bot Conversation</Text>
                            <label className="small">Starter bot</label>
                            <input className="form-control form-control-sm" value={ aiDuetBotA } onChange={ event => setAiDuetBotA(event.target.value) } />
                            <label className="small">Opponent bot</label>
                            <input className="form-control form-control-sm" value={ aiDuetBotB } onChange={ event => setAiDuetBotB(event.target.value) } />
                            <label className="small">Topic</label>
                            <textarea className="form-control form-control-sm" rows={ 2 } value={ aiDuetTopic } onChange={ event => setAiDuetTopic(event.target.value) } />
                            <label className="small">Max turns (2-20)</label>
                            <input className="form-control form-control-sm" value={ aiDuetTurns } onChange={ event => setAiDuetTurns(event.target.value) } />
                            <Flex gap={ 2 }>
                                <Button variant="primary" onClick={ submitStartAiDuet }>Start Bot Chat</Button>
                                <Button variant="warning" onClick={ submitStopAiDuet }>Stop Bot Chat</Button>
                            </Flex>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>,
                document.body)
            }
        </>
    );
}
