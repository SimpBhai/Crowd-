// Audio calling utility using Web Audio API for ringtones and MediaDevices for microphone
class AudioCallManager {
  private audioCtx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringInterval: number | null = null;
  private localStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play outgoing ringtone (simulated telephone/soft beep tone)
  startOutgoingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    const playBeep = () => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch (e) {
        console.warn("Ringtone audio play error:", e);
      }
    };

    playBeep();
    this.ringInterval = window.setInterval(playBeep, 2500);
  }

  // Play incoming ring chime
  startIncomingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    const playChime = () => {
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "triangle";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc2.frequency.setValueAtTime(880, now + 0.15); // A5

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now + 0.15);
        osc2.stop(now + 1.6);
      } catch (e) {
        console.warn("Incoming chime error:", e);
      }
    };

    playChime();
    this.ringInterval = window.setInterval(playChime, 2200);
  }

  // Call connected sound
  playConnectChime() {
    this.stopRingtone();
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.3); // C6

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Connect chime error:", e);
    }
  }

  // Call ended tone
  playEndChime() {
    this.stopRingtone();
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("End chime error:", e);
    }
  }

  stopRingtone() {
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOscillator) {
      try {
        this.ringOscillator.stop();
        this.ringOscillator.disconnect();
      } catch {}
      this.ringOscillator = null;
    }
  }

  // Request real microphone audio
  async requestMicrophone(): Promise<MediaStream | null> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localStream = stream;

        // Attach analyser for speech wave visualizer
        const ctx = this.getAudioContext();
        this.micSource = ctx.createMediaStreamSource(stream);
        this.micAnalyser = ctx.createAnalyser();
        this.micAnalyser.fftSize = 64;
        this.micSource.connect(this.micAnalyser);

        return stream;
      }
    } catch (err) {
      console.warn("Microphone access denied or unavailable in current environment, using simulated voice stream:", err);
    }
    return null;
  }

  // Get current voice volume intensity (0 to 100) for UI waveforms
  getAudioLevel(): number {
    if (!this.micAnalyser) {
      // Return subtle animated voice waveform when in call
      return Math.floor(25 + Math.random() * 40);
    }
    const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(100, Math.round((average / 255) * 100 * 1.8));
  }

  // Set mute state
  setMuted(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  // Terminate call stream
  cleanupCall() {
    this.stopRingtone();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }
    this.micAnalyser = null;
  }
}

export const audioCallManager = new AudioCallManager();
