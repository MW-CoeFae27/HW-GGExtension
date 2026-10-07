/* Developer Power Mode Combo: Web Audio chiptune player (synthesized locally, no files). */
(function (root) {
  'use strict';

  const MASTER_VOLUME = 0.05;
  const FADE_IN_S = 0.25;
  const FADE_OUT_S = 0.12;

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function tone(ctx, dest, midi, time, dur, type, gain) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToHz(midi);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(env).connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function perc(ctx, dest, noise, kind, time) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const dur = kind === 'bell' ? 0.12 : 0.05;
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = kind === 'bell' ? 7000 : kind === 'shaker' ? 5000 : 2500;
    env.gain.setValueAtTime(kind === 'shaker' ? 0.12 : 0.2, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter).connect(env).connect(dest);
    src.start(time);
    src.stop(time + dur + 0.01);
    if (kind === 'bell') tone(ctx, dest, 98, time, 0.15, 'sine', 0.12);
  }

  /**
   * Renders one seamless loop of `song`. Two passes are rendered and the second is kept,
   * so note tails from the end of the loop carry over into its start.
   */
  async function renderSong(song, sampleRate) {
    const stepDur = 60 / song.bpm / 2;
    const steps = song.lead.length;
    const frames = Math.round(steps * stepDur * sampleRate);
    const ctx = new root.OfflineAudioContext(1, frames * 2, sampleRate);
    const noise = ctx.createBuffer(1, Math.round(sampleRate * 0.2), sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    for (let i = 0; i < steps * 2; i++) {
      const step = i % steps;
      const time = i * stepDur;
      const lead = song.lead[step];
      const bass = song.bass[step];
      if (lead) tone(ctx, ctx.destination, lead, time, stepDur * 0.9, song.leadWave, song.leadGain);
      if (bass) tone(ctx, ctx.destination, bass, time, stepDur * 1.8, song.bassWave, song.bassGain);
      if (song.perc && step % (song.percEvery || 2) === 0) perc(ctx, ctx.destination, noise, song.perc, time);
    }

    const rendered = await ctx.startRendering();
    const loop = new root.AudioBuffer({ length: frames, numberOfChannels: 1, sampleRate });
    loop.copyToChannel(rendered.getChannelData(0).subarray(frames, frames * 2), 0);
    return loop;
  }

  /** Position in the loop derived from the wall clock, so every page joins the "same broadcast". */
  function clockOffset(duration, nowMs = Date.now()) {
    return (nowMs / 1000) % duration;
  }

  function createMusicPlayer() {
    let ac = null;
    let master = null;
    let wanted = false;
    let armed = false;
    let song = null;
    let current = null;
    let token = 0;
    const buffers = new Map();

    function onGesture() {
      disarm();
      sync();
    }

    // Autoplay policy: wait for a real user gesture on the page before creating audio.
    function arm() {
      if (armed) return;
      armed = true;
      root.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
      root.addEventListener('keydown', onGesture, { capture: true, passive: true });
    }

    function disarm() {
      if (!armed) return;
      armed = false;
      root.removeEventListener('pointerdown', onGesture, { capture: true });
      root.removeEventListener('keydown', onGesture, { capture: true });
    }

    function ensureContext() {
      if (ac) return true;
      const activation = root.navigator && root.navigator.userActivation;
      if (!activation || !activation.hasBeenActive) {
        arm();
        return false;
      }
      ac = new root.AudioContext({ latencyHint: 'playback' });
      master = ac.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ac.destination);
      return true;
    }

    function stopCurrent() {
      if (!current) return;
      const { src, gain } = current;
      const t = ac.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + FADE_OUT_S);
      src.stop(t + FADE_OUT_S + 0.02);
      current = null;
    }

    async function sync() {
      const mine = ++token;
      if (!wanted || !song || !ensureContext()) return;
      if (current && current.song === song && ac.state === 'running') return;

      const target = song;
      let pending = buffers.get(target);
      if (!pending) {
        pending = renderSong(target, ac.sampleRate);
        buffers.set(target, pending);
        pending.catch(() => buffers.delete(target));
      }
      let buffer;
      try {
        buffer = await pending;
      } catch {
        return;
      }
      if (ac.state !== 'running') {
        arm();
        try {
          await ac.resume();
        } catch {
          return;
        }
        disarm();
      }
      if (mine !== token || !wanted || song !== target) return;

      stopCurrent();
      const src = ac.createBufferSource();
      const gain = ac.createGain();
      const start = ac.currentTime + 0.03;
      src.buffer = buffer;
      src.loop = true;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + FADE_IN_S);
      src.connect(gain).connect(master);
      src.start(start, clockOffset(buffer.duration, Date.now() + 30));
      current = { song: target, src, gain };
    }

    return {
      play(nextSong) {
        wanted = true;
        song = nextSong;
        sync();
      },
      pause() {
        wanted = false;
        token++;
        disarm();
        if (!ac) return;
        stopCurrent();
        setTimeout(() => {
          if (!wanted && ac.state === 'running') ac.suspend();
        }, (FADE_OUT_S + 0.05) * 1000);
      },
    };
  }

  root.PMCAudio = { createMusicPlayer, renderSong, midiToHz, clockOffset };
})(globalThis);
