Scriptname YacaBridgeQuest extends Quest

; Bridge state inspired by yaca-systems/fivem-yaca-typescript.
; Supports 8 configurable voice range stages and key bindings loaded from config.json via the TS layer.

Int Property PluginState = 0 Auto
Float Property VoiceRange = 3.0 Auto
Bool Property VoiceRangeChangeAllowed = True Auto
Bool Property MicrophoneMuted = False Auto
Bool Property SoundMuted = False Auto
Bool Property RadioActive = False Auto
Int Property RadioChannel = 0 Auto
Bool Property PhoneCallActive = False Auto
Int Property PhonePeerRemoteId = -1 Auto

; Voice range stages (up to 8, set by TS layer from config.json)
Float Property VoiceRangeStage0 = 1.0 Auto
Float Property VoiceRangeStage1 = 3.0 Auto
Float Property VoiceRangeStage2 = 8.0 Auto
Float Property VoiceRangeStage3 = 15.0 Auto
Float Property VoiceRangeStage4 = 20.0 Auto
Float Property VoiceRangeStage5 = 25.0 Auto
Float Property VoiceRangeStage6 = 30.0 Auto
Float Property VoiceRangeStage7 = 40.0 Auto
Int Property VoiceRangeCount = 8 Auto
Int Property VoiceRangeIndex = 1 Auto

; Key bindings (set by TS layer from config.json)
String Property KeyIncreaseRange = "ADD" Auto
String Property KeyDecreaseRange = "SUBTRACT" Auto
String Property KeyRadioPrimary = "N" Auto
String Property KeyRadioSecondary = "CAPITAL" Auto
String Property KeyMegaphone = "B" Auto

Event OnInit()
    Debug.Trace("[YacaBridgeQuest] OnInit")
    RegisterForKey(GetKeyCode(KeyIncreaseRange))
    RegisterForKey(GetKeyCode(KeyDecreaseRange))
    RegisterForKey(GetKeyCode(KeyRadioPrimary))
    RegisterForKey(GetKeyCode(KeyRadioSecondary))
    RegisterForKey(GetKeyCode(KeyMegaphone))
EndEvent

; Called by the TS layer after setting key properties, to re-register with updated keys
Function RefreshKeyBindings()
    UnregisterForAllKeys()
    RegisterForKey(GetKeyCode(KeyIncreaseRange))
    RegisterForKey(GetKeyCode(KeyDecreaseRange))
    RegisterForKey(GetKeyCode(KeyRadioPrimary))
    RegisterForKey(GetKeyCode(KeyRadioSecondary))
    RegisterForKey(GetKeyCode(KeyMegaphone))
    Debug.Trace("[YacaBridgeQuest] Key bindings refreshed")
EndFunction

Event OnKeyDown(Int keyCode)
    If keyCode == GetKeyCode(KeyIncreaseRange)
        CycleVoiceRange(True)
    ElseIf keyCode == GetKeyCode(KeyDecreaseRange)
        CycleVoiceRange(False)
    ElseIf keyCode == GetKeyCode(KeyRadioPrimary)
        SetRadioTransmitting(True, RadioChannel)
    ElseIf keyCode == GetKeyCode(KeyRadioSecondary)
        SetRadioTransmitting(True, 1)
    ElseIf keyCode == GetKeyCode(KeyMegaphone)
        SetMegaphoneActive(True)
    EndIf
EndEvent

Event OnKeyUp(Int keyCode)
    If keyCode == GetKeyCode(KeyRadioPrimary)
        SetRadioTransmitting(False, RadioChannel)
    ElseIf keyCode == GetKeyCode(KeyRadioSecondary)
        SetRadioTransmitting(False, 1)
    ElseIf keyCode == GetKeyCode(KeyMegaphone)
        SetMegaphoneActive(False)
    EndIf
EndEvent

; Returns the current voice range stage value by index
Float Function GetVoiceRangeStage(Int index)
    If index == 0
        Return VoiceRangeStage0
    ElseIf index == 1
        Return VoiceRangeStage1
    ElseIf index == 2
        Return VoiceRangeStage2
    ElseIf index == 3
        Return VoiceRangeStage3
    ElseIf index == 4
        Return VoiceRangeStage4
    ElseIf index == 5
        Return VoiceRangeStage5
    ElseIf index == 6
        Return VoiceRangeStage6
    ElseIf index == 7
        Return VoiceRangeStage7
    EndIf
    Return VoiceRangeStage1
EndFunction

Function SetPluginState(Int newState)
    If PluginState == newState
        Return
    EndIf

    PluginState = newState
    Debug.Trace("[YacaBridgeQuest] PluginState=" + newState)
EndFunction

Function SetVoiceRange(Float newRange)
    VoiceRange = newRange
    Debug.Trace("[YacaBridgeQuest] VoiceRange=" + newRange)
EndFunction

Float Function GetVoiceRange()
    Return VoiceRange
EndFunction

Function SetVoiceRangeChangeAllowed(Bool allowed)
    VoiceRangeChangeAllowed = allowed
    Debug.Trace("[YacaBridgeQuest] VoiceRangeChangeAllowed=" + allowed)
EndFunction

Bool Function GetVoiceRangeChangeAllowed()
    Return VoiceRangeChangeAllowed
EndFunction

Function CycleVoiceRange(Bool increase = True)
    If VoiceRangeChangeAllowed == False
        Return
    EndIf

    Int maxIndex = VoiceRangeCount - 1

    If increase
        VoiceRangeIndex += 1
        If VoiceRangeIndex > maxIndex
            VoiceRangeIndex = 0
        EndIf
    Else
        VoiceRangeIndex -= 1
        If VoiceRangeIndex < 0
            VoiceRangeIndex = maxIndex
        EndIf
    EndIf

    SetVoiceRange(GetVoiceRangeStage(VoiceRangeIndex))
EndFunction

Function SetMicrophoneMuted(Bool muted)
    If MicrophoneMuted == muted
        Return
    EndIf

    MicrophoneMuted = muted
    Debug.Trace("[YacaBridgeQuest] MicrophoneMuted=" + muted)
EndFunction

Function SetSoundMuted(Bool muted)
    If SoundMuted == muted
        Return
    EndIf

    SoundMuted = muted
    Debug.Trace("[YacaBridgeQuest] SoundMuted=" + muted)
EndFunction

Function SetRadioState(Bool active, Int channel = 0)
    RadioActive = active
    RadioChannel = channel
    Debug.Trace("[YacaBridgeQuest] Radio active=" + active + ", channel=" + channel)
EndFunction

Function SetRadioTransmitting(Bool transmitting, Int channel)
    Debug.Trace("[YacaBridgeQuest] RadioTransmitting=" + transmitting + ", channel=" + channel)
EndFunction

Bool Property MegaphoneActive = False Auto

Function SetMegaphoneActive(Bool active)
    If MegaphoneActive == active
        Return
    EndIf

    MegaphoneActive = active
    Debug.Trace("[YacaBridgeQuest] Megaphone=" + active)
EndFunction

Function StartPhoneCall(Int peerRemoteId)
    PhoneCallActive = True
    PhonePeerRemoteId = peerRemoteId
    Debug.Trace("[YacaBridgeQuest] Phone call started with remoteId=" + peerRemoteId)
EndFunction

Function StopPhoneCall()
    PhoneCallActive = False
    PhonePeerRemoteId = -1
    Debug.Trace("[YacaBridgeQuest] Phone call stopped")
EndFunction

Function ApplySnapshot(Int newPluginState, Float newVoiceRange, Bool canChangeRange, Bool micMuted, Bool sndMuted, Bool radioEnabled, Int radioFreq, Bool phoneActive, Int phonePeerId)
    PluginState = newPluginState
    VoiceRange = newVoiceRange
    VoiceRangeChangeAllowed = canChangeRange
    MicrophoneMuted = micMuted
    SoundMuted = sndMuted
    RadioActive = radioEnabled
    RadioChannel = radioFreq
    PhoneCallActive = phoneActive
    PhonePeerRemoteId = phonePeerId

    Debug.Trace("[YacaBridgeQuest] Snapshot applied")
EndFunction

