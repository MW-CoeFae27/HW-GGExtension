/* Developer Power Mode Combo: tiny Web Audio chiptune player (synthesized locally, no files). */
(function (root) {
  'use strict';

  const LOOKAHEAD_S = 0.25;

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function createMusicPlayer() {
    let ac = null;
    let master = null;
    let noise = null;
    let song = null;
    let step = 0;
    let nextTime = 0;
    let wanted = false;
    let armed = false;

    function onGesture() {
      disarm();
      if (wanted) start();
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

    function start() {
      if (!ac) {
        const activation = root.navigator && root.navigator.userActivation;
        if (!activation || !activation.hasBeenActive) {
          arm();
          return;
        }
        ac = new root.AudioContext();
        master = ac.createGain();
        master.gain.value = 0.05;
        master.connect(ac.destination);
      }
      if (ac.state !== 'running') {
        ac.resume()
          .then(() => {
            if (!wanted) ac.suspend();
          })
          .catch(arm);
      }
    }

    function noiseBuffer() {
      if (!noise) {
        noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.2), ac.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      return noise;
    }

    function tone(midi, time, dur, type, gain) {
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.type = type;
      osc.frequency.value = midiToHz(midi);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(gain, time + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(env).connect(master);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    }

    function perc(kind, time) {
      const src = ac.createBufferSource();
      const filter = ac.createBiquadFilter();
      const env = ac.createGain();
      const dur = kind === 'bell' ? 0.12 : 0.05;
      src.buffer = noiseBuffer();
      filter.type = 'highpass';
      filter.frequency.value = kind === 'bell' ? 7000 : kind === 'shaker' ? 5000 : 2500;
      env.gain.setValueAtTime(kind === 'shaker' ? 0.12 : 0.2, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(filter).connect(env).connect(master);
      src.start(time);
      src.stop(time + dur + 0.01);
      if (kind === 'bell') tone(98, time, 0.15, 'sine', 0.12);
    }

    function playStep(i, time, stepDur) {
      const lead = song.lead[i % song.lead.length];
      const bass = song.bass[i % song.bass.length];
      if (lead) tone(lead, time, stepDur * 0.9, song.leadWave, song.leadGain);
      if (bass) tone(bass, time, stepDur * 1.8, song.bassWave, song.bassGain);
      if (song.perc && i % (song.percEvery || 2) === 0) perc(song.perc, time);
    }

    return {
      play(nextSong) {
        wanted = true;
        if (nextSong !== song) {
          song = nextSong;
          step = 0;
          nextTime = 0;
        }
        start();
      },
      pause() {
        wanted = false;
        disarm();
        if (ac && ac.state === 'running') ac.suspend();
      },
      /** Schedules notes slightly ahead; called from the overlay's single animation loop. */
      pump() {
        if (!wanted || !song || !ac || ac.state !== 'running') return;
        const stepDur = 60 / song.bpm / 2;
        if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
        while (nextTime < ac.currentTime + LOOKAHEAD_S) {
          playStep(step, nextTime, stepDur);
          step = (step + 1) % song.lead.length;
          nextTime += stepDur;
        }
      },
    };
  }

  root.PMCAudio = { createMusicPlayer, midiToHz };
})(globalThis);
