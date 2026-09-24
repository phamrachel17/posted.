"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_VOICE_MS = 5 * 60 * 1000;
const MIN_VOICE_MS = 1000;
const PEAK_BARS = 64;
const SAMPLE_MS = 50;

type Format = { recorderMime: string; mime: string; ext: string };

const FORMATS: Format[] = [
  { recorderMime: "audio/webm;codecs=opus", mime: "audio/webm", ext: "webm" },
  { recorderMime: "audio/mp4", mime: "audio/mp4", ext: "m4a" },
  { recorderMime: "audio/webm", mime: "audio/webm", ext: "webm" },
  { recorderMime: "audio/ogg;codecs=opus", mime: "audio/ogg", ext: "ogg" },
];

export function pickFormat(): Format | null {
  if (typeof MediaRecorder === "undefined") return null;
  return FORMATS.find((f) => MediaRecorder.isTypeSupported(f.recorderMime)) ?? null;
}

export type Recording = {
  blob: Blob;
  url: string;
  mime: string;
  ext: string;
  duration_ms: number;
  peaks: number[];
};

export type RecorderState = "idle" | "starting" | "recording" | "review";
export type RecorderProblem = "blocked" | "unsupported" | "too-short" | "failed" | null;

/** Squeezes loudness samples into a fixed number of bars, scaled 4–100. */
export function toPeaks(samples: number[], bars = PEAK_BARS): number[] {
  if (!samples.length) return [];
  const max = Math.max(...samples, 0.01);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = Math.floor((i * samples.length) / bars);
    const end = Math.max(start + 1, Math.floor(((i + 1) * samples.length) / bars));
    const slice = samples.slice(start, end);
    out.push(Math.round(4 + (Math.max(...slice) / max) * 96));
  }
  return out;
}

/**
 * Records a voice memo with MediaRecorder and measures loudness with an
 * AnalyserNode so the waveform is the memo's real shape.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [problem, setProblem] = useState<RecorderProblem>(null);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const startedRef = useRef(0);
  const discardRef = useRef(false);

  const teardown = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const start = useCallback(async () => {
    setProblem(null);
    const format = pickFormat();
    if (!format || !navigator.mediaDevices?.getUserMedia) {
      setProblem("unsupported");
      return;
    }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType: format.recorderMime, audioBitsPerSecond: 32000 });
      recorderRef.current = rec;
      samplesRef.current = [];
      discardRef.current = false;

      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const duration = Date.now() - startedRef.current;
        teardown();
        if (discardRef.current) {
          setState("idle");
          return;
        }
        if (duration < MIN_VOICE_MS) {
          setProblem("too-short");
          setState("idle");
          return;
        }
        const blob = new Blob(chunks, { type: format.mime });
        setRecording({
          blob,
          url: URL.createObjectURL(blob),
          mime: format.mime,
          ext: format.ext,
          duration_ms: Math.min(duration, MAX_VOICE_MS),
          peaks: toPeaks(samplesRef.current),
        });
        setState("review");
      };

      rec.start(250);
      startedRef.current = Date.now();
      setElapsed(0);
      setLive([]);
      setState("recording");

      timerRef.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        samplesRef.current.push(rms);
        setLive((l) => [...l.slice(-47), rms]);
        const ms = Date.now() - startedRef.current;
        setElapsed(ms);
        if (ms >= MAX_VOICE_MS) stop();
      }, SAMPLE_MS);
    } catch (err) {
      teardown();
      setState("idle");
      setProblem(err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError") ? "blocked" : "failed");
    }
  }, [stop, teardown]);

  const cancel = useCallback(() => {
    discardRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else teardown();
    setRecording((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setState("idle");
  }, [teardown]);

  const reset = useCallback(() => {
    setRecording((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setProblem(null);
    setState("idle");
  }, []);

  /** Puts a saved recording (from IndexedDB) back into review. */
  const restore = useCallback((r: Omit<Recording, "url">) => {
    setRecording({ ...r, url: URL.createObjectURL(r.blob) });
    setState("review");
  }, []);

  useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    teardown();
  }, [teardown]);

  return { state, problem, elapsed, live, recording, start, stop, cancel, reset, restore };
}

export { formatDuration } from "./duration";
