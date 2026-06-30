# LTX Video Generation Rules & Guidelines

Guidelines and prompting patterns for working with LTX-2.3 (Live-Action/Open-Source audio-video foundation models) on both the Cloud API and local ComfyUI GPU nodes.

## 1. Native Audio-Video Prompting Framework
LTX-2.3 is a Diffusion Transformer (DiT) model that generates synchronized video and audio *in a single pass*. Prompts should be structured like screenplays to maximize audio-visual coherence:

* **Single Paragraph format:** Write prompts as 4–8 sentences in a single, continuous paragraph using **present tense**.
* **Cinematic Headers:** Begin the prompt with screenplay-style headers (e.g., `EXT. PORT TOWN - SUNRISE - DRONE SHOT`).
* **Shot Scale & Detail Matching:** Detail density must match the camera view:
  * *Close-ups:* Specify micro-textures (skin pores, hair strands catching light, moisture).
  * *Wide shots:* Focus on environment layout, weather, lighting, and camera pans.
* **Camera Movement Markers:** Specify explicit camera directions (e.g., *“slow dolly in,” “handheld tracking,” “cameraman pans right”*). Describe the framing *after* the camera moves to help the model render motion smoothly.
* **Integrated Dialogue/Audio:** 
  * Put spoken dialogue inside **quotation marks** prefixed by the character and delivery tone: `Reporter (excitedly): "..."`.
  * Describe ambient sounds, whispers, or musical tones in the action description (e.g. *“the faint hum of distant drilling fills the air”*).

## 2. Erotic & Character Creator Guidelines
* **Avoid Abstract Emotion Labels:** Instead of saying a character is "sad" or "excited," describe physical cues (e.g. *“quivering lower lip, eyes rolled back in ecstasy,” “blushing red neck”*).
* **Subject Prompts:** Always start subjects with physical anchor definitions (e.g. `solo female, beautiful young woman, stunning model in her 20s`).
* **Detailed Hairstyles:** Incorporate rich styles and color modifiers (e.g. `Victory rolls honey blonde hair`, `undercut fade slick back dark brown hair`).

## 3. LipDub (Speech Replacement / Dubbing)
For video-to-video dialogue replacement:
* **Prompt Template:** `[Speaker] is speaking [Language/Accent], saying: "[Dialogue]"`
* **Native Scripting:** Write dialogue text using the script of the target language (e.g., Cyrillic for Russian, Hanzi for Chinese).
* **Length Constraints:** Syllable length of the prompt should match the source video length. Too long causes skipped words; too short causes slow, unnatural pacing.

## 4. What to Avoid
* **Readable Text:** LTX does not generate legible text/logos reliably yet.
* **Internal Emotion Labels:** Replace words like "scared" or "happy" with visual actions.
* **Overloaded Scenes:** Limit the number of subjects and actions to prevent rendering artifacts.
* **Conflicting Lighting:** Keep light sources consistent (e.g., do not combine studio softboxes with harsh direct noon sunlight in the same description).
