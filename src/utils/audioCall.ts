// Audio calling utility with WebRTC peer-to-peer audio, Web Audio API PCM streaming, and live microphone transmission

class AudioCallManager {
  private audioCtx: AudioContext | null = null;
  private ringInterval: number | null = null;
  private localStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private nextAudioPlayTime: number = 0;
  private isBroadcasting: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Outgoing phone ringtone
  startOutgoingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    const playBeep = () => {
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
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
        console.warn("Ringtone audio play notice:", e);
      }
    };

    playBeep();
    this.ringInterval = window.setInterval(playBeep, 2400);
  }

  // Incoming call chime
  startIncomingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    const playChime = () => {
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "triangle";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc2.frequency.setValueAtTime(880, now + 0.15); // A5

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now + 0.15);
        osc2.stop(now + 1.5);
      } catch (e) {
        console.warn("Incoming chime notice:", e);
      }
    };

    playChime();
    this.ringInterval = window.setInterval(playChime, 2200);
  }

  // Call connected chime
  playConnectChime() {
    this.stopRingtone();
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
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
      console.warn("Connect chime notice:", e);
    }
  }

  // Call ended tone
  playEndChime() {
    this.stopRingtone();
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
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
      console.warn("End chime notice:", e);
    }
  }

  // Emergency SOS Beacon Alarm Sound
  playSosAlarm() {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  stopRingtone() {
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Request actual microphone hardware
  async requestMicrophone(): Promise<MediaStream | null> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
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
      console.warn("Microphone access notice:", err);
    }
    return null;
  }

  // ----------------------------------------------------
  // ROBUST ZERO-LATENCY PCM AUDIO STREAMING (Web Audio API)
  // ----------------------------------------------------

  startAudioStreamBroadcast(onAudioChunk: (base64Chunk: string, sampleRate: number) => void) {
    if (!this.localStream || this.isBroadcasting) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      if (!this.micSource) {
        this.micSource = ctx.createMediaStreamSource(this.localStream);
      }

      // Buffer size 2048 gives ~46ms packets at 44.1kHz / ~42ms at 48kHz for responsive voice
      const bufferSize = 2048;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      const sampleRate = ctx.sampleRate;

      processor.onaudioprocess = (e) => {
        if (this.isMuted) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        // Quantize Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const len = inputBuffer.length;
        const int16Array = new Int16Array(len);
        let hasAudioActivity = false;

        for (let i = 0; i < len; i++) {
          const s = Math.max(-1, Math.min(1, inputBuffer[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          if (Math.abs(int16Array[i]) > 100) {
            hasAudioActivity = true;
          }
        }

        // Send audio chunk if there is voice activity or send periodic keepalive
        if (hasAudioActivity) {
          const uint8 = new Uint8Array(int16Array.buffer);
          let binary = "";
          const bytesLen = uint8.byteLength;
          for (let i = 0; i < bytesLen; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Chunk = btoa(binary);
          onAudioChunk(base64Chunk, sampleRate);
        }
      };

      this.micSource.connect(processor);
      // Connect to destination via silent gain to keep audio process pump flowing in browsers
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      this.scriptProcessor = processor;
      this.isBroadcasting = true;
    } catch (e) {
      console.warn("PCM audio broadcast notice:", e);
    }
  }

  // Play received audio PCM chunk seamlessly
  playAudioChunk(base64Chunk: string, remoteSampleRate: number = 44100) {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const binary = atob(base64Chunk);
      const samplesCount = Math.floor(binary.length / 2);
      if (samplesCount === 0) return;

      const rate = remoteSampleRate || ctx.sampleRate;
      const audioBuffer = ctx.createBuffer(1, samplesCount, rate);
      const channelData = audioBuffer.getChannelData(0);

      // Robust byte-pair conversion avoiding buffer alignment RangeError across mobile architectures
      for (let i = 0; i < samplesCount; i++) {
        const low = binary.charCodeAt(i * 2);
        const high = binary.charCodeAt(i * 2 + 1);
        let sample = (high << 8) | low;
        if (sample >= 0x8000) sample -= 0x10000;
        channelData[i] = sample / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Schedule continuous playout without audio gaps or stuttering
      const now = ctx.currentTime;
      const startTime = Math.max(now + 0.02, this.nextAudioPlayTime);
      source.start(startTime);
      this.nextAudioPlayTime = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn("Audio packet play notice:", err);
    }
  }

  // ----------------------------------------------------
  // WebRTC PEER CONNECTION (for direct p2p stream when reachable)
  // ----------------------------------------------------

  createPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteTrack: (stream: MediaStream) => void
  ): RTCPeerConnection {
    this.closePeerConnection();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.attachRemoteAudio(event.streams[0]);
        onRemoteTrack(event.streams[0]);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection = pc;
    return pc;
  }

  attachRemoteAudio(stream: MediaStream) {
    if (!this.remoteAudioElement) {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
    this.remoteAudioElement.srcObject = stream;
    this.remoteAudioElement.play().catch((e) => console.warn("Remote audio play notice:", e));
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
      });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (e) {
      console.warn("Create offer notice:", e);
      return null;
    }
  }

  async handleRemoteOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (e) {
      console.warn("Handle remote offer notice:", e);
      return null;
    }
  }

  async handleRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      console.warn("Handle remote answer notice:", e);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("Add ICE candidate notice:", e);
    }
  }

  // Get current voice volume intensity (0 to 100) for UI waveforms
  getAudioLevel(): number {
    if (this.isMuted) return 0;
    if (!this.micAnalyser) {
      return 0;
    }
    try {
      const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      return Math.min(100, Math.round((average / 255) * 100 * 2.5));
    } catch {
      return 0;
    }
  }

  // Set mute state
  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  closePeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }
    this.isBroadcasting = false;
    this.nextAudioPlayTime = 0;

    if (this.remoteAudioElement) {
      try {
        this.remoteAudioElement.pause();
        this.remoteAudioElement.srcObject = null;
      } catch {}
    }
  }

  // Terminate call stream
  cleanupCall() {
    this.stopRingtone();
    this.closePeerConnection();
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
