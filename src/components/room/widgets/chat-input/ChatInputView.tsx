import { HabboClubLevelEnum, ILinkEventTracker, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddEventLinkTracker, AiModalGetSettingsComposer, AiModalSettingsEvent, AiSettingsStore, ChatMessageTypeEnum, GetClubMemberLevel, GetCommunication, GetConfiguration, GetSessionDataManager, LocalizeText, registerAiModalPacketMessages, RemoveLinkEventTracker, RoomWidgetUpdateChatInputContentEvent, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, Text } from '../../../../common';
import { useChatInputWidget, useRoom, useSessionInfo, useUiEvent } from '../../../../hooks';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';

export const ChatInputView: FC<{}> = props =>
{
    const [ chatValue, setChatValue ] = useState<string>('');
    const [ isAiPanelVisible, setIsAiPanelVisible ] = useState<boolean>(false);
    const [ aiActiveTab, setAiActiveTab ] = useState<string>('agents');
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
    
    // Spawn spots state
    const [ spawnSpots, setSpawnSpots ] = useState<Array<{ name: string, x: number, y: number, id: number }>>( [
        { id: 1, name: 'entrance', x: 3, y: 3 },
        { id: 2, name: 'center', x: 4, y: 4 },
        { id: 3, name: 'corner', x: 1, y: 1 }
    ] );
    const [ selectedSpot, setSelectedSpot ] = useState<string>( '' );
    const [ newSpotName, setNewSpotName ] = useState<string>( '' );
    const [ selectedTile, setSelectedTile ] = useState<{ x: number, y: number }>( { x: 3, y: 3 } );
    
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
        
        // Use spot: parameter if a spot is selected
        if(selectedSpot) 
        {
            command += ` spot:${ selectedSpot }`;
        }
        else 
        {
            // Fall back to x: y: coordinates if provided
            if(spawnX.length) command += ` x:${ spawnX }`;
            if(spawnY.length) command += ` y:${ spawnY }`;
        }

        command += ` ${ persona }`;

        sendRawCommand(command);
    }, [ aiBotName, aiFigureType, aiSpawnX, aiSpawnY, aiPersona, selectedSpot, sendRawCommand ]);

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

            AiSettingsStore.hotelToken = parser.hotelToken || '';
            console.log(`[TTS] received hotel token from emulator (len=${ (parser.hotelToken || '').length })`);
        });

        communication.registerMessageEvent(event);

        // Request the hotel token at startup so bot TTS works without first
        // opening the :ai panel. The emulator mints it via the portal and relays
        // it through this same packet.
        SendMessageComposer(new AiModalGetSettingsComposer());

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
                <NitroCardView className="nitro-ai-manager-widget" theme="primary-slim" uniqueKey="nitro-ai-manager-widget" style={ { maxHeight: '65vh', height: '450px' } } offsetTop={ 50 }>
                    <NitroCardHeaderView headerText="AI Agent Manager" onCloseClick={ () => setIsAiPanelVisible(false) } />
                    
                    <NitroCardTabsView>
                        <NitroCardTabsItemView key="spawnspots" isActive={ aiActiveTab === 'spawnspots' } onClick={ () => setAiActiveTab('spawnspots') }>
                            Spawn Spots
                        </NitroCardTabsItemView>
                        <NitroCardTabsItemView key="agents" isActive={ aiActiveTab === 'agents' } onClick={ () => setAiActiveTab('agents') }>
                            Agents
                        </NitroCardTabsItemView>
                        <NitroCardTabsItemView key="duet" isActive={ aiActiveTab === 'duet' } onClick={ () => setAiActiveTab('duet') }>
                            Bot Duet
                        </NitroCardTabsItemView>
                        <NitroCardTabsItemView key="settings" isActive={ aiActiveTab === 'settings' } onClick={ () => setAiActiveTab('settings') }>
                            Settings
                        </NitroCardTabsItemView>
                    </NitroCardTabsView>
                    
                    <NitroCardContentView className="text-black" style={ { overflowY: 'auto', maxHeight: 'calc(65vh - 33px)' } }>
                        { aiActiveTab === 'spawnspots' && (
                            <Column gap={ 2 }>
                                <Text bold>Spawn Spots Management</Text>
                                <Text small>Click on tiles to mark spawn spots, or select from saved spots below</Text>
                                
                                { /* Simple grid visualization */ }
                                <div style={ { 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(8, 30px)',
                                    gap: '2px',
                                    backgroundColor: '#e0e0e0',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    margin: '8px 0'
                                } }>
                                    { Array.from({ length: 64 }, (_, i) => 
                                    {
                                        const x = i % 8;
                                        const y = Math.floor(i / 8);
                                        const isSelected = x === selectedTile.x && y === selectedTile.y;
                                        const isWalkable = x > 0 && x < 7 && y > 0 && y < 7;
                                        const hasSpot = spawnSpots.find(spot => spot.x === x && spot.y === y);
                                        
                                        return (
                                            <div 
                                                key={ i }
                                                style={ {
                                                    width: '30px',
                                                    height: '30px',
                                                    backgroundColor: hasSpot ? '#FF9800' : (isSelected ? '#4CAF50' : (isWalkable ? '#ffffff' : '#cccccc')),
                                                    border: '1px solid #999',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px'
                                                } }
                                                onClick={ () => 
                                                {
                                                    setSelectedTile({ x, y });
                                                } }
                                                title={ `(${ x }, ${ y })${ hasSpot ? ` - ${ hasSpot.name }` : '' }` }
                                            >
                                                { hasSpot ? '📍' : (isSelected ? '★' : '') }
                                            </div>
                                        );
                                    }) }
                                </div>
                                
                                <Text small>Selected: ({ selectedTile.x }, { selectedTile.y })</Text>
                                
                                <Flex gap={ 2 } alignItems="center">
                                    <input 
                                        className="form-control form-control-sm" 
                                        placeholder="Spot name (e.g., entrance)" 
                                        style={ { flex: 1 } }
                                        value={ newSpotName }
                                        onChange={ e => setNewSpotName(e.target.value) }
                                    />
                                    <Button variant="success" size="sm" onClick={ () => 
                                    {
                                        if (!newSpotName.trim()) return;
                                        const newSpot = {
                                            id: Date.now(),
                                            name: newSpotName.trim(),
                                            x: selectedTile.x,
                                            y: selectedTile.y
                                        };
                                        setSpawnSpots([ ...spawnSpots, newSpot ]);
                                        setNewSpotName('');
                                        setSelectedSpot(newSpotName.trim());
                                    } }>
                                        Save Spot
                                    </Button>
                                </Flex>
                                
                                <hr className="my-1" />
                                
                                <Text bold>Saved Spots</Text>
                                <div style={ { maxHeight: '120px', overflowY: 'auto' } }>
                                    <table className="table table-sm table-borderless">
                                        <tbody>
                                            { spawnSpots.map(spot => (
                                                <tr key={ spot.id }>
                                                    <td>{ spot.name }</td>
                                                    <td>({ spot.x }, { spot.y })</td>
                                                    <td>
                                                        <Button 
                                                            variant="danger" 
                                                            size="sm"
                                                            onClick={ () => 
                                                            {
                                                                setSpawnSpots(spawnSpots.filter(s => s.id !== spot.id));
                                                                if (selectedSpot === spot.name) 
                                                                {
                                                                    setSelectedSpot('');
                                                                }
                                                            } }
                                                        >
                                                            ×
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )) }
                                        </tbody>
                                    </table>
                                </div>
                                
                                <Text small>Tip: Select a spawn spot above, then create an agent. The command will use spot: parameter automatically.</Text>
                                <Text small>Example command: :setup_agent Aria spot:entrance Friendly assistant</Text>
                            </Column>
                        ) }
                        
                        { aiActiveTab === 'agents' && (
                            <Column gap={ 2 }>
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
                                <Flex gap={ 2 } alignItems="center">
                                    <select 
                                        className="form-control form-control-sm" 
                                        style={ { flex: 1 } }
                                        value={ selectedSpot }
                                        onChange={ (e) => 
                                        {
                                            const spotName = e.target.value;
                                            setSelectedSpot(spotName);
                                            if (spotName) 
                                            {
                                                const spot = spawnSpots.find(s => s.name === spotName);
                                                if (spot) 
                                                {
                                                    setAiSpawnX(spot.x.toString());
                                                    setAiSpawnY(spot.y.toString());
                                                }
                                            }
                                            else 
                                            {
                                                setAiSpawnX('');
                                                setAiSpawnY('');
                                            }
                                        } }
                                    >
                                        <option value="">-- Select spawn spot --</option>
                                        { spawnSpots.map(spot => (
                                            <option key={ spot.id } value={ spot.name }>
                                                { spot.name } ({ spot.x }, { spot.y })
                                            </option>
                                        )) }
                                    </select>
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        onClick={ () => 
                                        {
                                            setSelectedSpot('');
                                            setAiSpawnX('');
                                            setAiSpawnY('');
                                        } }
                                    >
                                        Clear
                                    </Button>
                                </Flex>
                                <Flex gap={ 2 } style={ { marginTop: '4px' } }>
                                    <input className="form-control form-control-sm" placeholder="x" value={ aiSpawnX } onChange={ event => 
                                    {
                                        setAiSpawnX(event.target.value);
                                        setSelectedSpot('');
                                    } } />
                                    <input className="form-control form-control-sm" placeholder="y" value={ aiSpawnY } onChange={ event => 
                                    {
                                        setAiSpawnY(event.target.value);
                                        setSelectedSpot('');
                                    } } />
                                </Flex>
                                <label className="small">Persona</label>
                                <textarea className="form-control form-control-sm" rows={ 3 } value={ aiPersona } onChange={ event => setAiPersona(event.target.value) } />
                                <Button variant="primary" onClick={ submitSetupAgent }>Create Agent</Button>
                                
                                <Flex gap={ 2 } alignItems="center" style={ { marginTop: '8px' } }>
                                    <Text small style={ { flex: 1 } }>Command preview:</Text>
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        onClick={ () => 
                                        {
                                            const name = aiBotName.trim();
                                            const figureType = aiFigureType.trim().toLowerCase();
                                            const persona = aiPersona.trim();
                                            let command = `:setup_agent ${ name }`;
                                            if(figureType.length) command += ` type:${ figureType }`;
                                            if(selectedSpot) 
                                            {
                                                command += ` spot:${ selectedSpot }`;
                                            }
                                            else if(aiSpawnX.trim() && aiSpawnY.trim()) 
                                            {
                                                command += ` x:${ aiSpawnX.trim() } y:${ aiSpawnY.trim() }`;
                                            }
                                            command += ` ${ persona }`;
                                            
                                            navigator.clipboard.writeText(command);
                                            alert('Command copied to clipboard!');
                                        } }
                                    >
                                        Copy Command
                                    </Button>
                                </Flex>
                                <hr className="my-1" />
                                <Text bold>Remove Agent</Text>
                                <label className="small">Bot name</label>
                                <input className="form-control form-control-sm" value={ aiRemoveName } onChange={ event => setAiRemoveName(event.target.value) } />
                                <Flex gap={ 2 }>
                                    <Button variant="danger" onClick={ () => submitRemoveAgent(false) }>Remove One</Button>
                                    <Button variant="danger" onClick={ () => submitRemoveAgent(true) }>Remove All</Button>
                                </Flex>
                            </Column>
                        ) }
                        
                        { aiActiveTab === 'duet' && (
                            <Column gap={ 2 }>
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
                        ) }
                        
                        { aiActiveTab === 'settings' && (
                            <Column gap={ 2 }>
                                <Text bold>API Keys</Text>
                                <Text small>
                                    Your Anthropic and ElevenLabs keys are now managed in the web portal
                                    under Settings → Voice &amp; Audio. They are stored securely there and
                                    used automatically by your agents — no keys are entered in the hotel.
                                </Text>
                            </Column>
                        ) }
                    </NitroCardContentView>
                </NitroCardView>,
                document.body)
            }
        </>
    );
}
