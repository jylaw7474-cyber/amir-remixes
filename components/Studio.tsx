"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Mode, TrackView } from "@/lib/tracks";
import AudioUpload, { type UploadedAudio } from "./AudioUpload";
import TrackCard from "./TrackCard";
import { useTracks } from "./useTracks";

type Tab = Mode | "stems";

const TABS: { id: Tab; label: string }[] = [
  { id: "easy", label: "שיר מתיאור" },
  { id: "song", label: "שיר מהמילים שלי" },
  { id: "instrumental", label: "אינסטרומנטלי" },
  { id: "remix", label: "רימיקס" },
  { id: "extend", label: "הארכת שיר" },
  { id: "stems", label: "הפרדת ערוצים" },
];

const field = "w-full min-w-0 text-base rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent";
const button = "rounded-lg bg-accent px-5 py-2 font-bold text-on-accent disabled:opacity-50";
const ghost = "whitespace-nowrap rounded-lg border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-50";

export default function Studio() {
  const { tracks, loaded, error: loadError, upsert, remove } = useTracks();
  const [tab, setTab] = useState<Tab>("easy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [theme, setTheme] = useState("");
  const [extendTarget, setExtendTarget] = useState<{ track: TrackView; choice: number } | null>(null);
  const [remixTarget, setRemixTarget] = useState<{ track: TrackView; choice: number } | null>(null);
  const [upload, setUpload] = useState<UploadedAudio | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [stemUrl, setStemUrl] = useState("");
  const [stemResults, setStemResults] = useState<string[]>([]);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    const body: Record<string, unknown> = { mode: tab, title, prompt, lyrics };
    if (tab === "extend") {
      if (!extendTarget) return setError("תבחר שיר להארכה מהרשימה למטה");
      body.songId = extendTarget.track.choice_ids[extendTarget.choice];
    }
    if (tab === "remix" && remixTarget && !upload) {
      body.songId = remixTarget.track.choice_ids[remixTarget.choice];
    }
    if ((tab === "remix" || tab === "song") && upload) {
      if (!rightsConfirmed) return setError("צריך לאשר שיש לך זכות להשתמש בשיר");
      body.uploadPath = upload.path;
      body.rightsConfirmed = true;
    }
    const track = await run(() => api<TrackView>("/api/generate", { body }));
    if (track) upsert(track);
  }

  async function writeLyrics(mode: "generate" | "extend") {
    const result = await run(() =>
      api<{ title?: string; lyrics: string }>("/api/lyrics", { body: { mode, text: mode === "extend" ? lyrics : theme } }),
    );
    if (!result) return;
    setLyrics(mode === "extend" ? `${lyrics.trimEnd()}\n\n${result.lyrics}` : result.lyrics);
    if (result.title && !title) setTitle(result.title);
  }

  async function splitStems(url = stemUrl) {
    setTab("stems");
    setStemUrl(url);
    setStemResults([]);
    const result = await run(() => api<{ urls: string[] }>("/api/stems", { body: { url } }));
    if (result) setStemResults(result.urls);
  }

  function chooseRemix(track: TrackView, choice: number) {
    setRemixTarget({ track, choice });
    setUpload(null);
    setTab("remix");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setUploadFile(value: UploadedAudio | null) {
    setUpload(value);
    setRightsConfirmed(false);
    if (value) setRemixTarget(null);
  }

  function chooseExtend(track: TrackView, choice: number) {
    setExtendTarget({ track, choice });
    setTab("extend");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const extendable = tracks.filter((t) => t.status === "succeeded" && t.task_kind === "song" && t.choice_ids.length);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError(null);
              }}
              className={`rounded-full px-4 py-1.5 text-sm ${
                tab === t.id ? "bg-accent font-bold text-on-accent" : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "stems" && (
          <div className="flex flex-col gap-3">
            <input className={field} placeholder="שם השיר (לא חובה)" value={title} onChange={(e) => setTitle(e.target.value)} />

            {tab === "easy" && (
              <textarea
                className={`${field} min-h-24`}
                placeholder="תאר את השיר: סגנון, אווירה, נושא, שפה. למשל: שיר פופ ים-תיכוני שמח על קיץ בתל אביב, בעברית, זמרת"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            )}

            {tab === "remix" && (
              <>
                <AudioUpload
                  label="השיר לרימיקס"
                  maxSeconds={350}
                  hint="כל קובץ שמע, עד כ-6 דקות (מעבר לזה נחתך). קובץ גדול יכווץ לבד. אפשר גם ללחוץ ״רימיקס״ על שיר מהרשימה למטה."
                  value={upload}
                  onChange={setUploadFile}
                  rightsConfirmed={rightsConfirmed}
                  onRightsChange={setRightsConfirmed}
                />
                {!upload && remixTarget && (
                  <p className="rounded-xl bg-surface-2 p-3 text-sm">
                    רימיקס ל: <b>{remixTarget.track.title || remixTarget.track.prompt || "ללא שם"}</b> (גרסה {remixTarget.choice + 1})
                  </p>
                )}
                <textarea
                  className={`${field} min-h-24`}
                  placeholder="איך הרימיקס ישמע? למשל: גרסת האוס אנרגטית 124 BPM, או גרסה אקוסטית שקטה עם גיטרה"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </>
            )}

            {tab === "instrumental" && (
              <textarea
                className={`${field} min-h-24`}
                placeholder="תאר את הקטע: למשל דיפ האוס מלודי, 122 BPM, פסנתר וסינתים"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            )}

            {(tab === "song" || tab === "extend") && (
              <>
                {tab === "song" && (
                  <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
                    <p className="text-sm text-muted">אין מילים? תן נושא ונכתוב בשבילך:</p>
                    <div className="flex gap-2">
                      <input className={`${field} min-w-0`} placeholder="נושא לשיר" value={theme} onChange={(e) => setTheme(e.target.value)} />
                      <button className={ghost} disabled={busy || !theme.trim()} onClick={() => writeLyrics("generate")}>
                        כתוב מילים
                      </button>
                    </div>
                  </div>
                )}
                <textarea
                  className={`${field} min-h-48 leading-7`}
                  placeholder={tab === "extend" ? "מילים להמשך (לא חובה)" : "המילים של השיר. אפשר לסמן [Verse] [Chorus]"}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                />
                {tab === "song" && (
                  <>
                    <button className={`${ghost} self-start`} disabled={busy || !lyrics.trim()} onClick={() => writeLyrics("extend")}>
                      המשך לי את המילים
                    </button>
                    <AudioUpload
                      label="שיר בהשראה (לא חובה)"
                      maxSeconds={30}
                      hint="קטע שהסגנון והאווירה שלו ילקחו לשיר החדש. נלקחות 30 השניות הראשונות. כל קובץ שמע, קובץ גדול יכווץ לבד."
                      value={upload}
                      onChange={setUploadFile}
                      rightsConfirmed={rightsConfirmed}
                      onRightsChange={setRightsConfirmed}
                    />
                    {!upload && (
                      <input
                        className={field}
                        placeholder="סגנון (לא חובה): למשל רוק ישראלי, קול גברי, גיטרות"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {tab === "extend" && (
              <div className="rounded-xl bg-surface-2 p-3 text-sm">
                {extendTarget ? (
                  <p>
                    מאריך את: <b>{extendTarget.track.title || extendTarget.track.prompt || "ללא שם"}</b> (גרסה {extendTarget.choice + 1})
                  </p>
                ) : extendable.length ? (
                  <p className="text-muted">תלחץ &quot;הארכה&quot; על אחד השירים למטה.</p>
                ) : (
                  <p className="text-muted">עוד אין שירים מוכנים להארכה. תיצור שיר קודם.</p>
                )}
              </div>
            )}

            <button className={`${button} self-start`} disabled={busy} onClick={generate}>
              {busy ? "שולח..." : "צור"}
            </button>
          </div>
        )}

        {tab === "stems" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">מפריד שיר לערוצים (שירה, תופים, בס ועוד). אפשר להדביק קישור או ללחוץ &quot;הפרדת ערוצים&quot; על שיר למטה.</p>
            <input className={field} dir="ltr" placeholder="https://..." value={stemUrl} onChange={(e) => setStemUrl(e.target.value)} />
            <button className={`${button} self-start`} disabled={busy || !stemUrl.trim()} onClick={() => splitStems()}>
              {busy ? "מפריד..." : "הפרד"}
            </button>
            {stemResults.length > 0 && (
              <ul className="flex flex-col gap-2">
                {stemResults.map((url, i) => (
                  <li key={url}>
                    <a href={url} download className="text-accent hover:underline">ערוץ {i + 1} להורדה</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">אחרונים</h2>
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {loaded && !loadError && tracks.length === 0 && <p className="text-muted">עוד לא יצרת שירים.</p>}
        <div className="grid gap-3">
          {tracks.slice(0, 10).map((t) => (
            <TrackCard key={t.id} track={t} onDelete={remove} onExtend={chooseExtend} onRemix={chooseRemix} onStems={splitStems} />
          ))}
        </div>
      </section>
    </div>
  );
}
