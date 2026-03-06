import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, StatusBar, Animated } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ScreenKey, Ear, BoolResults, SaveStatus } from "./src/types";
import { apiCreateSession, apiSaveResult, boolToThresholds, classifyEar, STANDARD_FREQS } from "./src/utils/hearing";
import { WelcomeScreen }   from "./src/screens/WelcomeScreen";
import { EarIntroScreen }  from "./src/screens/EarIntroScreen";
import { TestScreen }      from "./src/screens/TestScreen";
import { InterludeScreen } from "./src/screens/InterludeScreen";
import { ResultsScreen }   from "./src/screens/ResultsScreen";
import { C } from "./src/theme";

export default function App() {
  const [screen,       setScreen]       = useState<ScreenKey>("splash");
  const [sessionId,    setSessionId]    = useState("");
  const [currentEar,   setCurrentEar]   = useState<Ear>("left");
  const [completedEar, setCompletedEar] = useState<Ear | null>(null);
  const [leftResults,  setLeftResults]  = useState<BoolResults>({});
  const [rightResults, setRightResults] = useState<BoolResults>({});
  const [testDate,     setTestDate]     = useState("");
  const [saveStatus,   setSaveStatus]   = useState<SaveStatus>(null);
  const leftRef  = useRef<BoolResults>({});
  const rightRef = useRef<BoolResults>({});

  // Splash fade-in then transition to welcome
  const splashOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(splashOpacity, { toValue:1, duration:600, useNativeDriver:true }),
      Animated.delay(600),
      Animated.timing(splashOpacity, { toValue:0, duration:400, useNativeDriver:true }),
    ]).start(() => setScreen("welcome"));
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = async () => {
    const { session_id } = await apiCreateSession();
    setSessionId(session_id);
    setTestDate(new Date().toLocaleString());
    setCurrentEar("left");
    setScreen("ear_intro");
  };

  const handleEarIntroBegin = () => setScreen("test");

  const handleTestComplete = async (ear: Ear, results: BoolResults) => {
    if (ear === "left")  { setLeftResults(results);  leftRef.current  = results; }
    if (ear === "right") { setRightResults(results); rightRef.current = results; }
    setCompletedEar(ear);

    const bothDone =
      Object.keys(leftRef.current).length  > 0 &&
      Object.keys(rightRef.current).length > 0;

    if (bothDone) {
      setScreen("results");
      setSaveStatus("saving");
      try {
        const lT = boolToThresholds(leftRef.current);
        const rT = boolToThresholds(rightRef.current);
        await apiSaveResult({
          session_id:            sessionId,
          date:                  testDate,
          left_thresholds_dBHL:  lT,
          right_thresholds_dBHL: rT,
          left_classification:   classifyEar(lT).label,
          right_classification:  classifyEar(rT).label,
          frequencies_Hz:        STANDARD_FREQS,
          left_raw_responses:    leftRef.current,
          right_raw_responses:   rightRef.current,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 5000);
      } catch {
        setSaveStatus("error");
      }
    } else {
      setScreen("interlude");
    }
  };

  const handleInterludeContinue = () => {
    setCurrentEar("right");
    setScreen("ear_intro");
  };

  const handleRetake = () => {
    setLeftResults({}); setRightResults({});
    leftRef.current = {}; rightRef.current = {};
    setCompletedEar(null);
    setSessionId(""); setTestDate(""); setSaveStatus(null);
    setScreen("welcome");
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <SafeAreaView style={styles.safe}>
        {screen === "splash" && (
          <Animated.View style={[styles.splash, { opacity: splashOpacity }]}/>
        )}
        {screen === "welcome" && (
          <WelcomeScreen onStart={handleStart}/>
        )}
        {screen === "ear_intro" && (
          <EarIntroScreen ear={currentEar} onBegin={handleEarIntroBegin}/>
        )}
        {screen === "test" && (
          <TestScreen ear={currentEar} sessionId={sessionId} onComplete={handleTestComplete}/>
        )}
        {screen === "interlude" && completedEar && (
          <InterludeScreen completedEar={completedEar} onContinue={handleInterludeContinue}/>
        )}
        {screen === "results" && (
          <ResultsScreen
            leftResults={leftResults}   rightResults={rightResults}
            sessionId={sessionId}       testDate={testDate}
            saveStatus={saveStatus}     onRetake={handleRetake}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe:   { flex:1, backgroundColor: C.bg },
  splash: { flex:1, backgroundColor: C.bg },
});
