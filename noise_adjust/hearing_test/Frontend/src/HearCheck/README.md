# HearCheck — React Native (Expo)

A cinematic hearing test app built with Expo + TypeScript.

---

## Project structure

```
HearCheck/
├── App.tsx                        ← root component, screen router
├── app.json                       ← Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
└── src/
    ├── types.ts                   ← shared TypeScript types
    ├── theme.ts                   ← colours, shared StyleSheet
    ├── utils/
    │   └── hearing.ts             ← API stubs, tone synthesis, classifyEar, export
    ├── components/
    │   ├── WaveRing.tsx           ← SoundWave + ProgressRing
    │   └── AudiogramChart.tsx     ← SVG audiogram
    └── screens/
        ├── WelcomeScreen.tsx      ← checklist unfold animation
        ├── EarIntroScreen.tsx     ← "Let's begin with your left ear"
        ├── TestScreen.tsx         ← tone playback + response buttons
        ├── InterludeScreen.tsx    ← animated checkmark, "Now your right ear"
        └── ResultsScreen.tsx      ← audiogram, recommendations, CTA
```

---

## Quick start

### 1. Install Expo CLI

```bash
npm install -g expo-cli
# or
npx expo --version   # works without global install too
```

### 2. Install dependencies

```bash
cd HearCheck
npm install
```

### 3. Run on your device

```bash
npx expo start
```

Then scan the QR code with the **Expo Go** app (iOS App Store / Google Play).

### Run on simulator

```bash
npx expo start --ios      # requires Xcode on macOS
npx expo start --android  # requires Android Studio
```

---

## Tone playback

The app synthesises pure sine-wave tones in JavaScript, writes them as WAV
files to the device cache, then plays them with `expo-av`.

**To use your Python backend instead**, open `src/utils/hearing.ts` and replace
the `playTone` function body with:

```ts
export async function playTone(frequency: number, ear: Ear, durationMs = 1500): Promise<void> {
  const url = `${API_BASE}/tone?session=${sessionId}&freq=${frequency}&ear=${ear}`;
  const { sound } = await Audio.Sound.createAsync({ uri: url });
  await sound.playAsync();
  await new Promise<void>(resolve => {
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) resolve();
    });
  });
  await sound.unloadAsync();
}
```

---

## Backend API stubs

All three stubs are in `src/utils/hearing.ts`. Uncomment the `fetch()` calls
and set `API_BASE` to your server:

| Function            | Endpoint            | When called                     |
|---------------------|---------------------|---------------------------------|
| `apiCreateSession`  | `POST /session`     | On "Start Now"                  |
| `apiSubmitResponse` | `POST /response`    | After each tone response        |
| `apiSaveResult`     | `POST /save_result` | After both ears complete        |

**Flask CORS** (add to your Python server):
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

---

## Export / share

Results are shared via the **native iOS/Android share sheet** using
`expo-sharing`. Tapping ⬇ JSON or ⬇ CSV opens the share sheet so the user
can save to Files, AirDrop, email, etc.

---

## Screen flow

```
Splash (0.8s) → Welcome (checklist unfold) → Left Ear Intro
→ Test (left) → Interlude ("Done! Now right ear") → Right Ear Intro
→ Test (right) → Results (audiogram + recommendations + CTA)
```

---

## Dependencies

| Package                     | Purpose                        |
|-----------------------------|--------------------------------|
| `expo-av`                   | Audio playback                 |
| `expo-file-system`          | Write WAV/JSON/CSV to cache    |
| `expo-sharing`              | Native share sheet             |
| `react-native-svg`          | Audiogram chart + progress ring|
| `react-native-safe-area-context` | Safe area padding          |

---

## Customisation

- **Colours / fonts** — edit `src/theme.ts`
- **Test frequencies** — edit `TEST_FREQUENCIES` in `src/utils/hearing.ts`
- **dB stub mapping** — replace `boolToThresholds()` with real values from backend
- **"Let's Go" CTA** — wire up `Alert.alert(...)` in `ResultsScreen.tsx` to your navigation

---

## Building for production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure
eas build:configure

# Build
eas build --platform ios
eas build --platform android
```
