# Song Analysis and Singing Features for Alex

This document describes the new song analysis and singing capabilities added to Alex, your AI voice agent.

## New Features

### 1. Song Analysis (`analyzeSong`)

Alex can now analyze uploaded audio files to provide detailed musical insights.

**What it analyzes:**
- **Tempo & Rhythm**: BPM (beats per minute), time signature, and rhythmic patterns
- **Key & Harmony**: Musical key, chord progressions, and harmonic structure
- **Instrumentation**: Identified instruments and their roles in the composition
- **Vocal Analysis**: Vocal range, singing style, and vocal techniques (if vocals are present)
- **Genre & Style**: Primary and secondary genres, plus musical influences
- **Mood & Emotion**: Emotional tone, atmosphere, and energy level
- **Production Quality**: Mix quality, sound design, and production techniques
- **Song Structure**: Verse-chorus structure, arrangement, and transitions
- **Lyrics Analysis**: Themes, storytelling, and lyrical content (if lyrics are audible)
- **Overall Assessment**: Strengths, weaknesses, and notable characteristics

**How to use:**
1. Upload an audio file (MP3, WAV, etc.) through the file upload interface
2. Ask Alex to analyze it: "Alex, analyze song [filename]"
3. Alex will provide a comprehensive musical analysis

**Example:**
```
User: "Alex, analyze song my-track.mp3"
Alex: "Sige Boss, analyzing song: my-track.mp3..."
[Detailed analysis follows]
```

### 2. Singing Capability (`singASong`)

Alex can now sing songs with expressive vocals! You can provide lyrics or let Alex improvise based on a theme.

**Parameters:**
- **theme** (required): The theme or mood of the song (e.g., "happy birthday", "motivational", "romantic ballad")
- **lyrics** (optional): Specific lyrics to sing. If not provided, Alex will create lyrics based on the theme
- **style** (optional): The singing style (e.g., "pop", "jazz", "rock", "opera", "rap")

**How to use:**
1. Ask Alex to sing about a specific theme
2. Optionally provide specific lyrics and/or a style
3. Alex will generate and perform the song with vocals

**Examples:**

Simple request:
```
User: "Alex, sing a happy birthday song"
Alex: *sings a cheerful happy birthday tune*
```

With specific style:
```
User: "Alex, sing a motivational song in rock style"
Alex: *performs an energetic rock-style motivational anthem*
```

With custom lyrics:
```
User: "Alex, sing these lyrics in jazz style: [your lyrics here]"
Alex: *performs your lyrics with smooth jazz vocals*
```

## Technical Implementation

### Service Functions (geminiService.ts)

- `analyzeSong(audioBlob: Blob): Promise<string>` - Analyzes audio files using Gemini AI's multimodal capabilities
- `generateSinging(lyrics: string | undefined, theme: string, style: string | undefined): Promise<string>` - Generates expressive singing audio

### Tool Declarations (constants.ts)

Two new tool functions added to Alex's capabilities:
- `analyzeSong` - Enables song analysis functionality
- `singASong` - Enables singing capability

### App Integration (App.tsx)

- Audio file blobs are now stored in memory for analysis
- Tool handlers integrated into the main tool execution flow
- Singing audio is played back through the existing audio playback system

## Voice Quality

The singing feature uses Gemini's text-to-speech (TTS) model with the "Charon" voice profile, configured for expressive audio output. The system wraps lyrics with singing markers to enhance vocal expression.

## Notes

- Audio files uploaded for song analysis are also stored for potential app idea analysis (existing functionality)
- Song analysis requires the audio file to be uploaded first
- Singing is generated on-demand and played immediately
- Both features work in both voice and chat modes
