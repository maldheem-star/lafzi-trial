# Azure Speech — Pronunciation Assessment returns no scores (REST, short audio)

*(تقرير لعرضه على مهندس أو نموذج آخر. كل ما فيه مقيس من سجلّات حقيقية، ولا يحتوي أي مفتاح.)*

## 1. What we are trying to do

A children's English app scores a single spoken English word (e.g. `gate`, `eagle`,
`invent`) against a reference text, and shows the child **which phoneme was wrong**.
Word-level "right/wrong" is already solved with Whisper; the whole point of adding
Azure is the per-phoneme breakdown.

## 2. Architecture

```
Browser (iOS Safari / Android Chrome)
  └─ Web Audio ScriptProcessor tap → PCM → 16 kHz mono 16-bit WAV built in JS
       └─ base64 → POST → Supabase Edge Function (Deno, region eu-central-1)
            └─ POST → Azure Speech REST short-audio endpoint
```

The WAV is built in the browser on purpose: `MediaRecorder` produces WebM (Android)
or MP4/AAC (iOS), neither of which the Azure short-audio REST endpoint accepts.

## 3. The exact Azure request

```
POST https://centralindia.stt.speech.microsoft.com
     /speech/recognition/conversation/cognitiveservices/v1
     ?language=en-US&format=detailed

Ocp-Apim-Subscription-Key: <32-char alphanumeric key from the resource>
Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000
Accept: application/json
Pronunciation-Assessment: <base64 of the JSON below, no padding stripped>

body: raw WAV bytes
```

Pronunciation-Assessment JSON before base64:

```json
{
  "ReferenceText": "gate",
  "GradingSystem": "HundredMark",
  "Granularity": "Phoneme",
  "Dimension": "Comprehensive",
  "EnableMiscue": true
}
```

Audio, verified by our own RIFF/WAVE chunk parser before sending:
`format=1 (PCM), channels=1, sampleRate=16000, bits=16, ~95,000 bytes (~3 s)`.

## 4. The symptom

Azure returns **HTTP 200** with `RecognitionStatus: "Success"` and a **correct
transcription** every single time. Speech recognition works perfectly.

But `NBest[0]` contains **no `PronunciationAssessment` object**, and the per-word
entries carry **no `PronunciationAssessment` sub-object** either — so every accuracy
score is absent (our code read absent as `0`).

### Evidence that a `Words` array *is* returned, without scores

This is inferred, not directly logged, and the inference is worth checking. Before we
added a guard, the app's scoring function had two branches:

* if `Words.length === referenceWordCount` → use Azure's numeric scores
* else → fall back to comparing the transcript text

Over 16 real attempts on 2026-08-09:

| Target | Azure transcript | Score awarded | Branch taken |
|---|---|---|---|
| race | `Race.` | 0 | Azure numbers (1 word == 1 word) |
| summer | `Summer.` | 0 | Azure numbers |
| gate | `Gate.` | 0 | Azure numbers |
| invent | `Invent.` | 0 | Azure numbers |
| spoon | `Spoon.` | 0 | Azure numbers |
| team | `Team.` | 0 | Azure numbers |
| planet | `Planet.` | 0 | Azure numbers |
| eagle | `Eagle.` | 0 | Azure numbers |
| pocket | `Pocket.` | 0 | Azure numbers |
| **chess** | `Chess, chess.` | **100** | text fallback (2 words != 1) |
| **taxi** | `Taxi, taxi.` | **100** | text fallback |
| **match** | `Match match.` | **100** | text fallback |
| **winter** | `Winter. Winter.` | **100** | text fallback |
| **planet** | `Planet, Planet.` | **100** | text fallback |

Every utterance that took the *Azure-numbers* branch scored 0; every utterance that
took the *text* branch scored 100. If `Words` had been empty, the single-word cases
would also have fallen through to text and scored 100. They did not.

**So: `NBest[0].Words` appears to be populated (one entry per recognized word), but
with no `PronunciationAssessment` on the entries.** That matters, because a plain
`format=detailed` request without pronunciation assessment does *not* normally return
a `Words` array at all — suggesting Azure partially honoured the header rather than
ignoring it outright.

Since then the function explicitly detects this and returns `noAssessment: true`, and
the app silently falls back to Whisper. Live log, 2026-08-09 → 2026-08-10:
**16 consecutive attempts, all `azure_no_assessment`, zero successful assessments.**

## 5. What has already been ruled out (with the measurement that ruled it out)

| Hypothesis | Ruled out by |
|---|---|
| Wrong / missing key | Function reports key length and SHA-256; digest matches the one Supabase shows for the stored secret. |
| Invisible character in the key (this really did happen once — a pasted U+200F made `fetch` throw `TypeError: … not a valid ByteString`) | Key is now sanitized to `[\x21-\x7E]` and the stripped code points are reported. Currently zero stripped characters. |
| Wrong region string | Trimmed, lowercased, validated `/^[a-z][a-z0-9]+$/`; host echoed in the error payload. |
| Auth / quota / bad request | Distinct error codes for 401/403, 429, 400. **None of them fire — the call returns 200.** |
| Audio format | Our own RIFF parser validates PCM/16 kHz/mono/16-bit before sending, and Azure transcribes the audio correctly, which it could not do if the audio were malformed. |
| Silence or no speech | `RecognitionStatus` is `Success` and the transcript is the right word. |
| Resource type (multi-service `CognitiveServices` vs dedicated Speech) | A dedicated **Speech service** resource was created fresh. *Still to be retested.* |

## 6. What has NOT been tested

* **Region.** Both resources are in `centralindia`. A resource in e.g. `westeurope`
  has not been tried. Region cannot be changed after creation.
* **Pricing tier.** The resource is believed to be **F0 (free)**; not yet confirmed
  from the Overview blade.

## 7. The questions we want answered

1. Is **Pronunciation Assessment** available in the `centralindia` region? Is there an
   authoritative, current list of regions where it is supported — as opposed to
   regions where plain speech-to-text works?
2. Is Pronunciation Assessment restricted on the **F0 free tier**? (Plain STT clearly
   is not — it works.)
3. Does the behaviour described in §4 — HTTP 200, `RecognitionStatus: Success`,
   `Words` present, **no `PronunciationAssessment` anywhere** — have a known cause
   other than region/tier? Specifically:
   * Is the `Pronunciation-Assessment` header still honoured on the
     `.../recognition/conversation/cognitiveservices/v1` short-audio REST endpoint, or
     has it been quietly restricted to the Speech SDK / a newer API?
   * Does the header value need anything we are not doing — different base64 (URL-safe,
     unpadded), a different `Content-Type`, an extra query parameter, or
     `Granularity: "Phoneme"` requiring something additional?
   * Does `EnableMiscue: true` with a **single-word** reference text cause the
     assessment to be dropped?
4. If the REST path is a dead end, what is the smallest working alternative that still
   returns **phoneme-level** scores from a server-side Deno/edge runtime (no Node
   native modules, no Speech SDK binary)? Is there a plain-HTTP API that returns
   phoneme scores?

## 8. Second opinion received (2026-08-11) — and what still needs checking

A reviewer reported that this is a known service-side defect: the same symptom
(HTTP 200, `RecognitionStatus: Success`, correct transcript, `PronunciationAssessment`
absent) was described on Microsoft Q&A in May 2026 for `southeastasia` on **S0**, and
also reproduced in `centralindia`; and that the region does officially list
Pronunciation Assessment as supported. If that holds, then **neither region nor the F0
tier is the cause**, and no configuration change on our side will fix it.

We have not independently verified that thread. Two things follow regardless:

* The remaining open item in §6 (pricing tier) stops being decisive — worth reading off
  the Overview blade, but it no longer changes the plan.
* Escalating to Microsoft requires a support plan that covers technical cases;
  pay-as-you-go/free subscriptions cannot open one without buying support. So
  "open a ticket" may not be an available path here.

The app now captures the full raw Azure JSON on `noAssessment` and shows it in the
in-app diagnostic with a copy button, so §4's inference can be replaced with the
actual response body.

## 9. Constraints on any proposed fix

* Server side is **Deno on Supabase Edge Functions** — fetch only, no Node-native
  addons. A solution requiring the Microsoft Speech SDK's native bits will not run.
* Client is a **single static HTML file**, no build step. The key must never reach the
  client.
* Free or near-free is strongly preferred; this is one child's practice app, a few
  dozen utterances a day.
* A working fallback (Whisper via Groq, word-level only) is already in production, so
  the cost of Azure never working is losing the phoneme feedback — not losing the app.
