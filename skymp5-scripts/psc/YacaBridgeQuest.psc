Scriptname YacaBridgeQuest extends Quest

; Minimal bridge state inspired by yaca-systems/fivem-yaca-typescript.
; This script is intentionally small and focused on voice state synchronization.

Int Property PluginState = 0 Auto
Float Property VoiceRange = 150.0 Auto
Bool Property VoiceRangeChangeAllowed = True Auto
Bool Property MicrophoneMuted = False Auto
Bool Property SoundMuted = False Auto
Bool Property RadioActive = False Auto
Int Property RadioChannel = 0 Auto
Bool Property PhoneCallActive = False Auto
Int Property PhonePeerRemoteId = -1 Auto

Float Property VoiceRangeNear = 150.0 Auto
Float Property VoiceRangeNormal = 400.0 Auto
Float Property VoiceRangeFar = 1000.0 Auto
Int Property VoiceRangeIndex = 1 Auto

Event OnInit()
    Debug.Trace("[YacaBridgeQuest] OnInit")
EndEvent

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

    If increase
        VoiceRangeIndex += 1
        If VoiceRangeIndex > 2
            VoiceRangeIndex = 0
        EndIf
    Else
        VoiceRangeIndex -= 1
        If VoiceRangeIndex < 0
            VoiceRangeIndex = 2
        EndIf
    EndIf

    If VoiceRangeIndex == 0
        SetVoiceRange(VoiceRangeNear)
    ElseIf VoiceRangeIndex == 1
        SetVoiceRange(VoiceRangeNormal)
    Else
        SetVoiceRange(VoiceRangeFar)
    EndIf
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
