/**
 * QuickCapture — 3-tap mobile content upload
 *
 * Tap 1 → take / choose photo
 * Tap 2 → record voice note (tap again to stop)
 * Tap 3 → send
 *
 * Under 30 seconds. No forms. No decisions.
 * The team reviews, polishes, and posts — nothing goes live without approval.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Camera, Mic, Square, Send, CheckCircle2, RotateCcw, Play, Loader2 } from "lucide-react";

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

type Step = "capture" | "submitting" | "done";

export default function QuickCapture() {
  const { user } = useAuth();
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: !!user });
  const workspaceId = workspaces?.[0]?.id;
  const platforms = (workspaces?.[0]?.selectedPlatforms as string[])?.length
    ? (workspaces![0].selectedPlatforms as string[])
    : ["facebook", "instagram"];

  // ── Photo ─────────────────────────────────────────────────────────────────
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast.error("Photo too large — max 15 MB"); return; }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = "";
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null); setPreview(null);
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { setVoice(new Blob(chunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); mrRef.current = mr;
      setRecording(true); setSecs(0);
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
    } catch { toast.error("Microphone access denied — check your browser settings"); }
  }

  function stopRec() {
    mrRef.current?.stop(); setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function clearVoice() {
    setVoice(null); setSecs(0); setPlaying(false);
    audioRef.current?.pause(); audioRef.current = null;
  }

  function playVoice() {
    if (!voice) return;
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    const url = URL.createObjectURL(voice);
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
    a.play(); setPlaying(true);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("capture");
  const ready = !!photo && !!voice;

  const submitMutation = trpc.quickCapture.submit.useMutation({
    onSuccess: () => setStep("done"),
    onError: (err) => { toast.error(err.message || "Upload failed — try again"); setStep("capture"); },
  });

  async function send() {
    if (!ready || !workspaceId) { if (!workspaceId) toast.error("No workspace — complete setup first"); return; }
    setStep("submitting");
    const b64 = (blob: Blob | File) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    submitMutation.mutate({
      workspaceId,
      mediaBase64: await b64(photo!),
      mediaType: "photo",
      mediaFilename: photo!.name,
      mediaMimeType: photo!.type,
      voiceBase64: await b64(voice!),
      voiceFilename: "voice.webm",
      platforms,
    });
  }

  function reset() { clearPhoto(); clearVoice(); setStep("capture"); }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[oklch(0.13_0.02_240)] flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Sent!</h1>
          <p className="text-white/50 max-w-xs leading-relaxed text-sm">
            Our team will polish the caption and get it approved. You'll be notified when it's ready to go live.
          </p>
        </div>
        <button
          onClick={reset}
          className="bg-violet-600 hover:bg-violet-500 text-white px-8 h-12 rounded-2xl font-semibold text-sm transition-colors"
        >
          Add another
        </button>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[oklch(0.13_0.02_240)] text-white flex flex-col">

      {/* Top strip */}
      <div className="px-5 pt-8 pb-2">
        <h1 className="text-xl font-bold">Quick upload</h1>
        <p className="text-white/40 text-xs mt-0.5">Photo + voice note → we handle the rest</p>
      </div>

      <div className="flex-1 px-5 pb-8 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* ── TAP 1: Photo ── */}
        {preview ? (
          <div className="relative rounded-3xl overflow-hidden flex-1 min-h-[240px] max-h-[380px]">
            <img src={preview} alt="" className="w-full h-full object-cover" />
            {/* Retake overlay */}
            <button
              onClick={clearPhoto}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-full"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retake
            </button>
            {/* Step badge */}
            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              ✓ Photo added
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 min-h-[240px] rounded-3xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-4 active:bg-white/10 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-violet-600/30 flex items-center justify-center">
              <Camera className="w-10 h-10 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Tap to take a photo</p>
              <p className="text-white/30 text-xs mt-1">or choose from your gallery</p>
            </div>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhoto} />

        {/* ── TAP 2: Voice ── */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          {voice ? (
            /* Playback row */
            <div className="flex items-center gap-4">
              <button
                onClick={playVoice}
                className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center shrink-0"
              >
                {playing ? <Square className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-1.5 flex-1 bg-white/10 rounded-full">
                    <div className="h-1.5 bg-violet-500 rounded-full w-full" />
                  </div>
                  <span className="text-xs text-white/40 shrink-0">{fmt(secs)}</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">✓ Voice note recorded</p>
              </div>
              <button onClick={clearVoice} className="text-white/20 hover:text-white/50 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ) : recording ? (
            /* Recording row */
            <div className="flex items-center gap-4">
              <button
                onClick={stopRec}
                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-pulse"
              >
                <Square className="w-5 h-5 text-white" />
              </button>
              <div>
                <p className="text-white font-bold text-2xl tabular-nums">{fmt(secs)}</p>
                <p className="text-xs text-red-400 mt-0.5">Recording… tap to stop</p>
              </div>
            </div>
          ) : (
            /* Start row */
            <button onClick={startRec} className="w-full flex items-center gap-4 active:opacity-70 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-violet-600/30 flex items-center justify-center shrink-0">
                <Mic className="w-7 h-7 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold">Tap to record</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Say what's in the photo — 10 seconds is plenty
                </p>
              </div>
            </button>
          )}
        </div>

        {/* ── TAP 3: Send ── */}
        <button
          onClick={send}
          disabled={!ready || step === "submitting"}
          className="w-full h-16 rounded-3xl font-bold text-base bg-violet-600 hover:bg-violet-500 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 transition-colors"
        >
          {step === "submitting" ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
          ) : (
            <><Send className="w-5 h-5" /> Send to our team</>
          )}
        </button>

        {!ready && (
          <p className="text-center text-xs text-white/25">
            {!photo && !voice ? "Add a photo and voice note to continue"
              : !photo ? "Add a photo to continue"
              : "Record a voice note to continue"}
          </p>
        )}

        {ready && (
          <p className="text-center text-xs text-white/25">
            Nothing goes live without our team reviewing it first
          </p>
        )}

      </div>
    </div>
  );
}
