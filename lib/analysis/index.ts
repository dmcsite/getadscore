import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { writeFile, unlink, mkdir, readFile } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Try to load ffmpeg installers, but don't fail if unavailable
let ffmpegPath = "ffmpeg";
let ffprobePath = "ffprobe";
let ffmpegAvailable = false;

async function initFfmpeg(): Promise<boolean> {
  try {
    const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
    const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
    ffmpegPath = ffmpegInstaller.default.path;
    ffprobePath = ffprobeInstaller.default.path;
    ffmpegAvailable = true;
    return true;
  } catch {
    try {
      await execAsync("which ffmpeg && which ffprobe");
      ffmpegAvailable = true;
      return true;
    } catch {
      console.log("ffmpeg not available - video processing disabled");
      return false;
    }
  }
}

const ffmpegReady = initFfmpeg();

// Types
export interface AdCopy {
  primaryText?: string;
  headline?: string;
  description?: string;
}

export interface AudioAnalysis {
  hasVoiceover: boolean;
  voiceoverStartsEarly: boolean;
  openingLine: string | null;
  transcript: string | null;
  hasCaptions: boolean;
  soundOffCompatible: boolean;
  audioHookScore: number;
  audioHookAssessment: string;
  isMusicOnly?: boolean;
}

export interface ExtractedFrame {
  timestamp: number;
  base64: string;
}

export interface AnalysisResult {
  overallScore: number;
  mediaType: 'image' | 'video';
  quickAudit: {
    offerMentioned: boolean;
    urgencyPresent: boolean;
    endCardPresent?: boolean;
  };
  categories: Array<{
    name: string;
    score: number;
    reason: string;
  }>;
  hookAnalysis?: {
    firstFrameScore: number;
    firstFrameAnalysis: string;
    threeSecondScore: number;
    threeSecondAnalysis: string;
    hookRecommendation: string;
  };
  copyAnalysis?: {
    primaryTextScore: number;
    primaryTextAnalysis: string;
    headlineScore: number;
    headlineAnalysis: string;
    copyCreativeAlignment: number;
    copyCreativeAlignmentReason: string;
    copyFixes: string[];
    primaryTextProvided?: string;
    headlineProvided?: string;
    descriptionProvided?: string;
  };
  videoNotes?: {
    pacing: string;
    textTiming: string;
    ctaTiming: string;
    textOverlayVerdict: string;
    endCardAnalysis: string;
  };
  policyFlags: string[];
  topFixes: string[];
  verdictReason: string;
  whatsWorking: string;
  executiveSummary: {
    biggestStrength: string;
    biggestRisk: string;
    quickWin: string;
  };
  scoreExplanation: {
    scoreDriver: string;
    scoreDrag: string;
  };
  extractedFrames?: ExtractedFrame[];
  audioAnalysis?: {
    hasVoiceover: boolean;
    voiceoverStartsEarly: boolean;
    openingLine: string | null;
    transcript: string | null;
    audioHookScore: number;
    audioHookAssessment: string;
    isMusicOnly: boolean;
  };
  thumbnail?: string;
  analyzedAt: string;
}

interface TimestampedWord {
  word: string;
  start: number;
  end: number;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export function isImageType(mimeType: string): boolean {
  return IMAGE_TYPES.includes(mimeType);
}

export function isVideoType(mimeType: string): boolean {
  return VIDEO_TYPES.includes(mimeType);
}

function buildCopyAnalysisSection(adCopy: AdCopy): string {
  if (!adCopy.primaryText && !adCopy.headline) {
    return "";
  }

  const copyDetails = [];
  if (adCopy.primaryText) {
    copyDetails.push(`Primary Text (${adCopy.primaryText.length} chars): "${adCopy.primaryText}"`);
  }
  if (adCopy.headline) {
    copyDetails.push(`Headline: "${adCopy.headline}"`);
  }
  if (adCopy.description) {
    copyDetails.push(`Description: "${adCopy.description}"`);
  }

  return `
AD COPY PROVIDED:
${copyDetails.join("\n")}

AD COPY ANALYSIS CRITERIA:
1. HOOK STRENGTH: Does the primary text open with a pattern interrupt, curiosity hook, or benefit? First line is critical.
2. BENEFIT CLARITY: Is the value prop clear within the first 2 lines (before "...see more")?
3. HEADLINE EFFECTIVENESS: Does the headline reinforce the CTA or create urgency?
4. COPY-CREATIVE ALIGNMENT: Does the text complement what's shown visually, or is there a disconnect?
5. LENGTH CHECK: Primary text over 125 chars gets truncated on mobile — is the hook visible before truncation?
6. EMOJI USAGE: Are emojis used appropriately (pattern interrupt, scanability) or excessively?

Include copyAnalysis in your response:
"copyAnalysis": {
  "primaryTextScore": <1-10>,
  "primaryTextAnalysis": "<Assessment of hook, benefit clarity, length, emoji usage>",
  "headlineScore": <1-10>,
  "headlineAnalysis": "<Assessment of headline effectiveness and urgency>",
  "copyCreativeAlignment": <1-10>,
  "copyCreativeAlignmentReason": "<Does the copy match/enhance the visual?>",
  "copyFixes": [
    "<Specific fix 1, e.g., 'First line is 156 chars — hook truncates on mobile. Move benefit to first 100 chars'>",
    "<Specific fix 2>",
    "<Specific fix 3>"
  ]
}

Factor copy scores into overall score: If copy is provided, copyCreativeAlignment should be weighted alongside Hook Clarity.
`;
}

export function buildImagePrompt(adCopy: AdCopy | null): string {
  const copySection = adCopy ? buildCopyAnalysisSection(adCopy) : "";
  const hasCopy = adCopy && (adCopy.primaryText || adCopy.headline);

  return `You are GetAdScore, an ad creative analyzer built by a media buyer who has spent millions on Facebook ads over 10+ years. Your job is to evaluate ad images and determine if they are worth testing before the advertiser spends money.

You are NOT predicting ROAS or performance. You are assessing CREATIVE READINESS — whether this ad has the fundamental elements that give it a fair shot at performing.

SCORING CATEGORIES (1-10 each):

1. THUMB-STOP POWER
Does this stop a scroll in a fast-moving feed?
- High contrast or unusual color combinations
- Human faces (especially eyes, expressions)
- Pattern interrupts (unexpected visuals)
- Movement implication or visual tension
- NOT: generic stock photos, flat product shots, busy/cluttered layouts

2. HOOK CLARITY (The 1-Second Test)
Can someone understand the value prop without reading?
- Visual demonstration of benefit
- Before/after implication (without violating policy)
- Clear "what's in it for me" communicated visually
- Text headline under 8 words if text is present
- NOT: paragraphs of text, unclear product purpose, requires context to understand

3. TEXT LEGIBILITY
Will this be readable on a phone screen?
- Text large enough for mobile (minimum 24pt equivalent)
- High contrast between text and background
- No more than 2-3 text elements competing
- Clean font choices (no cursive or decorative fonts for key info)
- Facebook's text density (under 20% of image ideal)

4. SOCIAL PROOF PRESENCE
Are there trust signals visible?
- Star ratings, review counts
- Testimonial snippets
- "As seen on" logos
- User counts ("10,000+ sold")
- Trust badges, certifications
- NOTE: Not every ad needs this — score based on whether it would help this specific ad

5. PRODUCT VISIBILITY
Can you clearly see what's being sold?
- Product is prominent, not hidden
- Shows the product in use or context
- Multiple angles or key features visible
- NOT: tiny product in corner, obscured by text, lifestyle shot where product is secondary

6. CTA STRENGTH
Is there a clear next step?
- Button or CTA element present
- Action-oriented language ("Shop Now" > "Learn More")
- Positioned where eyes naturally go (bottom-center or bottom-right)
- Creates urgency or curiosity
- NOTE: Some native-style ads intentionally omit CTAs — score contextually

7. EMOTIONAL TRIGGER
Does this hit a psychological lever?
- Pain point acknowledgment
- Desire/aspiration activation
- Curiosity gap (makes you want to know more)
- Fear of missing out
- Identity ("for people who...")
- NOT: purely rational/feature-based, emotionally flat

8. PLATFORM NATIVITY
Does this look like content or scream "AD"?
- Feels native to feed (UGC-style, organic look)
- Not overly polished/corporate
- Could believably be shared by a friend
- NOT: obvious stock imagery, heavy branding, corporate template look

META POLICY FLAGS (Yes/No + Explanation):
Scan for potential disapproval risks:
- Before/after imagery (banned for personal attributes)
- Personal attributes language ("Are you overweight?", "Do you have acne?")
- Exaggerated claims or superlatives
- Text density over 20%
- Unclear advertiser identity
- Potentially misleading elements

QUICK AUDIT CHECKLIST:
Scan the creative and ad copy (if provided) for these binary signals:
- offerMentioned: Is there an offer visible? Look for: "free", "discount", "% off", "BOGO", "free shipping", "free gift", "save", "deal"
- urgencyPresent: Is there urgency language? Look for: "limited time", "today only", "ends soon", "while supplies last", "don't miss", "last chance", "act now"
${copySection}
IMPORTANT: You must respond with ONLY valid JSON, no markdown, no code blocks. Use this exact structure:

{
  "overallScore": <number 0-100>,
  "mediaType": "image",
  "quickAudit": {
    "offerMentioned": <true/false>,
    "urgencyPresent": <true/false>
  },
  "categories": [
    {"name": "Thumb-Stop Power", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Hook Clarity", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Text Legibility", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Social Proof", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Product Visibility", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "CTA Strength", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Emotional Trigger", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Platform Nativity", "score": <1-10>, "reason": "<1 sentence>"}
  ],${hasCopy ? `
  "copyAnalysis": {
    "primaryTextScore": <1-10>,
    "primaryTextAnalysis": "<assessment>",
    "headlineScore": <1-10>,
    "headlineAnalysis": "<assessment>",
    "copyCreativeAlignment": <1-10>,
    "copyCreativeAlignmentReason": "<assessment>",
    "copyFixes": ["<fix1>", "<fix2>", "<fix3>"]
  },` : ""}
  "policyFlags": ["<flag1>", "<flag2>"] or [],
  "topFixes": [
    "<specific actionable fix 1>",
    "<specific actionable fix 2>",
    "<specific actionable fix 3>"
  ],
  "verdictReason": "<1-2 sentences explaining the overall quality and launch-readiness>",
  "whatsWorking": "<2-3 sentences on what the ad does well>",
  "executiveSummary": {
    "biggestStrength": "<5-10 words: the #1 thing this ad does well, e.g. 'Strong hook + native UGC format'>",
    "biggestRisk": "<5-10 words: the #1 issue that could hurt performance, e.g. 'Product appears late in first 3 seconds'>",
    "quickWin": "<5-15 words: the single fix with highest impact, e.g. 'Show product by 0.5s to boost conversions'>"
  },
  "scoreExplanation": {
    "scoreDriver": "<3-6 words: what's boosting the score, e.g. 'strong hook clarity and CTA'>",
    "scoreDrag": "<3-6 words: what's holding back the score, e.g. 'late product visibility'>"
  }
}

Calculate overallScore as weighted average: Thumb-stop and Hook Clarity weighted 2x because they determine if anything else matters.${hasCopy ? " If copy is provided, factor copyCreativeAlignment into the overall score." : ""}`;
}

export function buildVideoPrompt(audioAnalysis: AudioAnalysis | null, adCopy: AdCopy | null): string {
  const audioContext = audioAnalysis ? `
AUDIO ANALYSIS (from transcription):
- Has Voiceover: ${audioAnalysis.hasVoiceover ? "Yes" : "No"}
- Voiceover starts in first 2 seconds: ${audioAnalysis.voiceoverStartsEarly ? "Yes" : "No"}
- Opening line (first 5 seconds): "${audioAnalysis.openingLine || "N/A"}"
- Full transcript (first 10 seconds): "${audioAnalysis.transcript || "N/A"}"
${audioAnalysis.hasVoiceover ? `
IMPORTANT: Factor the audio hook into your scoring:
- If voiceover starts in first 2 seconds with a compelling hook, boost Thumb-Stop and Hook Clarity scores
- If voiceover is slow to start or doesn't hook immediately, note this as a fix
- Evaluate if the opening line is benefit-focused or generic
` : `
NOTE: No voiceover detected - this is music/ambient audio only.
- Check if captions/text in frames compensate for sound-off viewing
- If no captions visible, this is a critical fix for sound-off audiences (85%+ of social media viewers)
`}` : `
AUDIO ANALYSIS: Unable to analyze audio. Recommend manual verification.`;

  const copySection = adCopy ? buildCopyAnalysisSection(adCopy) : "";
  const hasCopy = adCopy && (adCopy.primaryText || adCopy.headline);

  return `You are GetAdScore, an ad creative analyzer built by a media buyer who has spent millions on Facebook ads over 10+ years. Your job is to evaluate ad VIDEOS and determine if they are worth testing before the advertiser spends money.

I'm showing you KEY FRAMES extracted from a video ad at different timestamps. Analyze these frames to understand the video's flow, pacing, and effectiveness.

${audioContext}

You are NOT predicting ROAS or performance. You are assessing CREATIVE READINESS — whether this ad has the fundamental elements that give it a fair shot at performing.

VIDEO-SPECIFIC ANALYSIS:
Pay special attention to:
- THE FIRST 3 SECONDS ARE CRITICAL - Frames at 0s, 1s, 2s, 3s show this crucial opening
- Hook timing: Does something compelling happen immediately based on the early frames?
- Pacing: How do the scenes change across the frames?
- TEXT/CAPTION ANALYSIS (CRITICAL): Definitively assess text overlays in the frames - ARE they clear, readable, and well-sized for mobile? Don't suggest verification - give a verdict based on what you see.
- END CARD/CTA: The final frames (last 3 seconds) show the CTA and end card - analyze these carefully for offer clarity and call-to-action strength

SCORING CATEGORIES (1-10 each):

1. THUMB-STOP POWER (First Frame & Opening)
Does the first frame (0s) stop a scroll?
- Strong opening frame that works as a static thumbnail
- Immediate visual hook or pattern interrupt
- NOT: slow fade-ins, logo intros, generic establishing shots

2. HOOK CLARITY (The 3-Second Test)
Based on frames 0s-3s AND the audio opening, can someone understand the value prop quickly?
- Visual demonstration of benefit shown early
- Clear "what's in it for me" communicated quickly
- Audio hook reinforces visual hook (if voiceover present)
- NOT: long buildups, unclear product purpose

3. TEXT LEGIBILITY
Is on-screen text readable in the frames?
- Text large enough for mobile viewing
- High contrast between text and background
- Captions present for sound-off viewing

4. SOCIAL PROOF PRESENCE
Are there trust signals visible in any frames?
- Star ratings, review counts shown
- Testimonial snippets or customer clips
- Trust badges

5. PRODUCT VISIBILITY
Can you clearly see what's being sold across frames?
- Product is prominently featured
- Shows the product in use or context

6. CTA STRENGTH
Is there a clear CTA, especially in later frames?
- End card or CTA element present
- Action-oriented language visible

7. EMOTIONAL TRIGGER
Does this hit a psychological lever?
- Pain point acknowledgment
- Desire/aspiration activation
- Transformation or results implied

8. PLATFORM NATIVITY
Does this look like content or scream "AD"?
- Feels native to feed (UGC-style, organic look)
- Appropriate style for social media

META POLICY FLAGS:
Scan for potential disapproval risks in any frame.

QUICK AUDIT CHECKLIST:
Scan ALL frames and ad copy (if provided) for these binary signals:
- offerMentioned: Is there an offer visible in ANY frame or text? Look for: "free", "discount", "% off", "BOGO", "free shipping", "free gift", "save", "deal"
- urgencyPresent: Is there urgency language in ANY frame or text? Look for: "limited time", "today only", "ends soon", "while supplies last", "don't miss", "last chance", "act now"
- endCardPresent: Is there a clear end card/CTA screen in the final frames? (based on your endCardAnalysis)
${copySection}
IMPORTANT: You must respond with ONLY valid JSON, no markdown, no code blocks. Use this exact structure:

{
  "overallScore": <number 0-100>,
  "mediaType": "video",
  "quickAudit": {
    "offerMentioned": <true/false>,
    "urgencyPresent": <true/false>,
    "endCardPresent": <true/false>
  },
  "hookAnalysis": {
    "firstFrameScore": <1-10>,
    "firstFrameAnalysis": "<What the viewer sees in the very first frame (0s) - is it scroll-stopping?>",
    "threeSecondScore": <1-10>,
    "threeSecondAnalysis": "<Based on frames 0-3s AND audio, is the hook clear and compelling?>",
    "hookRecommendation": "<Specific suggestion to improve the opening, considering both visual and audio>"
  },
  "categories": [
    {"name": "Thumb-Stop Power", "score": <1-10>, "reason": "<1 sentence about opening/first frame>"},
    {"name": "Hook Clarity", "score": <1-10>, "reason": "<1 sentence about first 3 seconds visual+audio>"},
    {"name": "Text Legibility", "score": <1-10>, "reason": "<1 sentence about on-screen text and captions>"},
    {"name": "Social Proof", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Product Visibility", "score": <1-10>, "reason": "<1 sentence about product visibility across frames>"},
    {"name": "CTA Strength", "score": <1-10>, "reason": "<1 sentence about end card/CTA>"},
    {"name": "Emotional Trigger", "score": <1-10>, "reason": "<1 sentence>"},
    {"name": "Platform Nativity", "score": <1-10>, "reason": "<1 sentence about style>"}
  ],${hasCopy ? `
  "copyAnalysis": {
    "primaryTextScore": <1-10>,
    "primaryTextAnalysis": "<assessment>",
    "headlineScore": <1-10>,
    "headlineAnalysis": "<assessment>",
    "copyCreativeAlignment": <1-10>,
    "copyCreativeAlignmentReason": "<assessment>",
    "copyFixes": ["<fix1>", "<fix2>", "<fix3>"]
  },` : ""}
  "videoNotes": {
    "pacing": "<Assessment of scene changes across frames>",
    "textTiming": "<Assessment of text visibility across frames>",
    "ctaTiming": "<Assessment of when CTA appears based on frames>",
    "textOverlayVerdict": "<DEFINITIVE verdict: either 'Text overlays are clear and readable throughout' OR specific issues like 'Text too small in frames at Xs' or 'No text overlays visible - relies on audio only'>",
    "endCardAnalysis": "<DEFINITIVE analysis of the final frames: What CTA/offer is shown? Is it clear and compelling?>"
  },
  "policyFlags": ["<flag1>", "<flag2>"] or [],
  "topFixes": [
    "<specific actionable fix 1>",
    "<specific actionable fix 2>",
    "<specific actionable fix 3>"
  ],
  "verdictReason": "<1-2 sentences explaining the overall quality and launch-readiness>",
  "whatsWorking": "<2-3 sentences on what the ad does well>",
  "executiveSummary": {
    "biggestStrength": "<5-10 words: the #1 thing this ad does well, e.g. 'Strong hook + native UGC format'>",
    "biggestRisk": "<5-10 words: the #1 issue that could hurt performance, e.g. 'Product appears late in first 3 seconds'>",
    "quickWin": "<5-15 words: the single fix with highest impact, e.g. 'Show product by 0.5s to boost conversions'>"
  },
  "scoreExplanation": {
    "scoreDriver": "<3-6 words: what's boosting the score, e.g. 'strong hook clarity and CTA'>",
    "scoreDrag": "<3-6 words: what's holding back the score, e.g. 'late product visibility'>"
  }
}

Calculate overallScore as weighted average: Thumb-stop and Hook Clarity weighted 2x.${hasCopy ? " If copy is provided, factor copyCreativeAlignment into the overall score." : ""}`;
}

async function extractAudioAndTranscribe(
  videoPath: string,
  tempDir: string
): Promise<AudioAnalysis | null> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.log("No OpenAI API key - skipping audio analysis");
    return null;
  }

  const audioPath = join(tempDir, "audio.mp3");

  try {
    await execAsync(
      `"${ffmpegPath}" -i "${videoPath}" -t 15 -vn -acodec libmp3lame -q:a 4 "${audioPath}" -y 2>/dev/null`
    );

    const audioStats = await readFile(audioPath).catch(() => null);
    if (!audioStats || audioStats.length < 1000) {
      return {
        hasVoiceover: false,
        voiceoverStartsEarly: false,
        openingLine: null,
        transcript: null,
        hasCaptions: false,
        soundOffCompatible: false,
        audioHookScore: 1,
        audioHookAssessment: "No audio track detected in video.",
      };
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    await unlink(audioPath).catch(() => {});

    const words = (transcription as { words?: TimestampedWord[] }).words || [];
    const fullText = transcription.text || "";

    if (!fullText.trim()) {
      return {
        hasVoiceover: false,
        voiceoverStartsEarly: false,
        openingLine: null,
        transcript: null,
        hasCaptions: false,
        soundOffCompatible: false,
        audioHookScore: 6,
        audioHookAssessment: "Music-only format — message delivery relies entirely on visual text overlays.",
        isMusicOnly: true,
      };
    }

    const wordCount = words.length;
    const lowerFullText = fullText.toLowerCase();
    const endCardPhrases = [
      "thanks for watching", "thank you for watching", "subscribe",
      "like and subscribe", "follow", "link in bio", "check out",
      "visit our", "shop now", "order now", "get yours",
    ];
    const isEndCardOnly = endCardPhrases.some((phrase) => lowerFullText.includes(phrase)) && wordCount < 15;
    const isMusicOnly = wordCount < 5 || isEndCardOnly;

    if (isMusicOnly) {
      const endCardNote = isEndCardOnly ? " End-card voiceover detected but no spoken hook." : "";
      return {
        hasVoiceover: false,
        voiceoverStartsEarly: false,
        openingLine: null,
        transcript: wordCount > 0 ? fullText.trim() : null,
        hasCaptions: false,
        soundOffCompatible: false,
        audioHookScore: 6,
        audioHookAssessment: `Music-only format — message delivery relies entirely on visual text overlays.${endCardNote}`,
        isMusicOnly: true,
      };
    }

    const firstWordTime = words.length > 0 ? words[0].start : 999;
    const voiceoverStartsEarly = firstWordTime <= 2.0;

    const openingWords = words.filter((w) => w.start <= 5.0);
    const openingLine = openingWords.map((w) => w.word).join(" ").trim();

    const first10Words = words.filter((w) => w.start <= 10.0);
    const transcript = first10Words.map((w) => w.word).join(" ").trim();

    let audioHookScore = 5;
    let audioHookAssessment = "";

    if (voiceoverStartsEarly) {
      audioHookScore += 2;
      audioHookAssessment = `Strong audio hook - voiceover starts at ${firstWordTime.toFixed(1)}s. `;
    } else {
      audioHookScore -= 2;
      audioHookAssessment = `Slow audio start - voiceover begins at ${firstWordTime.toFixed(1)}s (should be under 2s). `;
    }

    const lowerOpening = openingLine.toLowerCase();
    if (
      lowerOpening.includes("you") || lowerOpening.includes("your") ||
      lowerOpening.includes("want") || lowerOpening.includes("need") ||
      lowerOpening.includes("tired") || lowerOpening.includes("stop") ||
      lowerOpening.includes("imagine") || lowerOpening.includes("finally") ||
      lowerOpening.includes("?")
    ) {
      audioHookScore += 2;
      audioHookAssessment += "Opening line is benefit/problem-focused. ";
    } else if (
      lowerOpening.includes("hi") || lowerOpening.includes("hello") ||
      lowerOpening.includes("hey") || lowerOpening.includes("welcome")
    ) {
      audioHookScore -= 1;
      audioHookAssessment += "Opening with greeting - consider leading with benefit instead. ";
    }

    audioHookScore = Math.max(1, Math.min(10, audioHookScore));

    return {
      hasVoiceover: true,
      voiceoverStartsEarly,
      openingLine: openingLine || null,
      transcript: transcript || null,
      hasCaptions: false,
      soundOffCompatible: false,
      audioHookScore,
      audioHookAssessment: audioHookAssessment.trim(),
      isMusicOnly: false,
    };
  } catch (error) {
    console.error("Audio analysis error:", error);
    await unlink(audioPath).catch(() => {});
    return null;
  }
}

export async function extractVideoFrames(
  videoBuffer: Buffer,
  fileExt: string
): Promise<{ frames: string[]; extractedFrames: ExtractedFrame[]; audioAnalysis: AudioAnalysis | null }> {
  const tempDir = join(tmpdir(), `getadscore-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const videoPath = join(tempDir, `video${fileExt}`);
  await writeFile(videoPath, videoBuffer);

  const frames: string[] = [];
  const extractedFrames: ExtractedFrame[] = [];
  let audioAnalysis: AudioAnalysis | null = null;

  try {
    const audioPromise = extractAudioAndTranscribe(videoPath, tempDir);

    const { stdout: durationOutput } = await execAsync(
      `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const duration = parseFloat(durationOutput.trim()) || 30;

    const openingFrames = [0, 1, 2, 3];
    const midFrames = [5, 8, 12].filter((t) => t < duration - 4);
    const endFrames = [
      Math.max(0, duration - 3),
      Math.max(0, duration - 1),
      Math.max(0, duration - 0.5),
    ].filter((t) => t > 0);

    const allTimestamps = [...openingFrames, ...midFrames, ...endFrames];
    const uniqueTimestamps = [...new Set(allTimestamps.map((t) => Math.round(t * 10) / 10))]
      .sort((a, b) => a - b)
      .slice(0, 10);

    for (const timestamp of uniqueTimestamps) {
      const framePath = join(tempDir, `frame_${timestamp}.jpg`);
      try {
        await execAsync(
          `"${ffmpegPath}" -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y 2>/dev/null`
        );
        const frameBuffer = await readFile(framePath);
        const base64 = frameBuffer.toString("base64");
        frames.push(base64);
        extractedFrames.push({ timestamp, base64 });
        await unlink(framePath).catch(() => {});
      } catch {
        // Skip frames that fail to extract
      }
    }

    audioAnalysis = await audioPromise;
  } finally {
    await unlink(videoPath).catch(() => {});
    await execAsync(`rm -rf "${tempDir}"`).catch(() => {});
  }

  if (frames.length === 0) {
    throw new Error("Failed to extract any frames from video");
  }

  return { frames, extractedFrames, audioAnalysis };
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  await ffmpegReady;
  return ffmpegAvailable;
}

export async function analyzeMedia(
  buffer: Buffer,
  mimeType: string,
  adCopy: AdCopy | null = null
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const isVideo = isVideoType(mimeType);
  const isImage = isImageType(mimeType);

  if (!isVideo && !isImage) {
    throw new Error("Invalid media type");
  }

  const client = new Anthropic({ apiKey });

  type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  let messageContent: Anthropic.MessageParam["content"];
  let systemPrompt: string;
  let audioAnalysis: AudioAnalysis | null = null;
  let extractedFrames: ExtractedFrame[] = [];
  let imageBase64: string | null = null;

  if (isVideo) {
    await ffmpegReady;
    if (!ffmpegAvailable) {
      throw new Error("Video processing is temporarily unavailable");
    }

    const fileExt = mimeType === "video/mp4" ? ".mp4" :
                    mimeType === "video/quicktime" ? ".mov" : ".webm";

    const result = await extractVideoFrames(buffer, fileExt);
    const frames = result.frames;
    extractedFrames = result.extractedFrames;
    audioAnalysis = result.audioAnalysis;

    const frameContents: Anthropic.ImageBlockParam[] = frames.map((frame) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: frame,
      },
    }));

    const actualTimestamps = extractedFrames.map((f) => `${f.timestamp.toFixed(1)}s`).join(", ");
    const textContent: Anthropic.TextBlockParam = {
      type: "text",
      text: `Analyze this video ad. I've extracted ${frames.length} key frames at these timestamps: ${actualTimestamps}. The frames are shown in chronological order.

IMPORTANT:
- First 4 frames (0-3s): Critical opening/hook - analyze for thumb-stop power
- Middle frames: Pacing and content flow
- FINAL FRAMES (last 3 in sequence): These are from the last 3 seconds of the video - analyze for CTA, end card, and offer clarity

Give DEFINITIVE assessments on text overlays - don't say "verify" or "check" - state whether text IS or IS NOT clear and readable based on what you see in the frames.

Return only valid JSON.`,
    };

    messageContent = [...frameContents, textContent];
    systemPrompt = buildVideoPrompt(audioAnalysis, adCopy);
  } else {
    imageBase64 = buffer.toString("base64");
    messageContent = [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeType as ImageMediaType,
          data: imageBase64,
        },
      },
      {
        type: "text" as const,
        text: "Analyze and score this ad creative. Return only valid JSON.",
      },
    ];
    systemPrompt = buildImagePrompt(adCopy);
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: messageContent,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No response from AI");
  }

  let result: AnalysisResult;
  try {
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }
    result = JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse AI response:", textContent.text);
    throw new Error("Failed to parse AI response");
  }

  // Add audio analysis and frames to result for videos
  if (isVideo) {
    result.extractedFrames = extractedFrames;

    if (audioAnalysis) {
      result.audioAnalysis = {
        hasVoiceover: audioAnalysis.hasVoiceover,
        voiceoverStartsEarly: audioAnalysis.voiceoverStartsEarly,
        openingLine: audioAnalysis.openingLine,
        transcript: audioAnalysis.transcript,
        audioHookScore: audioAnalysis.audioHookScore,
        audioHookAssessment: audioAnalysis.audioHookAssessment,
        isMusicOnly: audioAnalysis.isMusicOnly || false,
      };
    } else {
      result.audioAnalysis = {
        hasVoiceover: false,
        voiceoverStartsEarly: false,
        openingLine: null,
        transcript: null,
        audioHookScore: 0,
        audioHookAssessment: "Audio analysis unavailable - OPENAI_API_KEY not configured.",
        isMusicOnly: false,
      };
    }
  }

  // Add image thumbnail for images
  if (!isVideo && imageBase64) {
    result.thumbnail = imageBase64;
  }

  // Add analysis timestamp
  result.analyzedAt = new Date().toISOString();

  // Add provided copy text to copyAnalysis for display
  if (adCopy && result.copyAnalysis) {
    result.copyAnalysis.primaryTextProvided = adCopy.primaryText || "";
    result.copyAnalysis.headlineProvided = adCopy.headline || "";
    result.copyAnalysis.descriptionProvided = adCopy.description || "";
  }

  return result;
}
