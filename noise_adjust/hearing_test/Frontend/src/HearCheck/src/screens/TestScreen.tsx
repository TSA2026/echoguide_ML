import React, { FC, useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from "react-native";
import { Ear, BoolResults } from "../types";
import { TEST_FREQUENCIES, playTone, apiSubmitResponse } from "../utils/hearing";
import { SoundWave, ProgressRing } from "../components/WaveRing";
import { C, shared } from "../theme";

interface Props {
  ear:        Ear;
  sessionId:  string;
  onComplete: (ear: Ear, results: BoolResults) => void;
}

export const TestScreen: FC<Props> = ({ ear, sessionId, onComplete }) => {
  const total = TEST_FREQUENCIES.length;
  const [step,    setStep]    = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [heard,   setHeard]   = useState<boolean | null>(null);
  const [results, setResults] = useState<BoolResults>({});
  const playingRef = useRef(false);

  const isLeft      = ear === "left";
  const color       = isLeft ? C.cyan : C.pink;
  const currentFreq = TEST_FREQUENCIES[step];

  const screenAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenAnim, { toValue:1, duration:400, useNativeDriver:true }).start();
  }, []);

  const triggerTone = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    setHeard(null);
    await playTone(currentFreq, ear);
    setPlaying(false);
    playingRef.current = false;
  }, [currentFreq, ear]);

  useEffect(() => {
    const t = setTimeout(triggerTone, 700);
    return () => clearTimeout(t);
  }, [step]);

  const handleResponse = async (didHear: boolean) => {
    if (waiting || playing) return;
    setHeard(didHear);
    setWaiting(true);
    const newResults = { ...results, [currentFreq]: didHear };
    setResults(newResults);
    await apiSubmitResponse(sessionId, ear, currentFreq, didHear);
    setTimeout(() => {
      setWaiting(false);
      if (step + 1 >= total) onComplete(ear, newResults);
      else setStep(s => s + 1);
    }, 480);
  };

  const percent = Math.round((step / total) * 100);

  return (
    <Animated.View style={[shared.screen, styles.shell,
      { opacity: screenAnim, transform:[{ translateY: screenAnim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }] }]}>

      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.earLabel, { color }]}>
            {isLeft ? "← Left Ear" : "Right Ear →"}
          </Text>
          <Text style={shared.muted}>Tone {step + 1} of {total}</Text>
        </View>
        <View style={styles.ringWrap}>
          <ProgressRing percent={percent} color={color} size={64}/>
          <Text style={[styles.ringText, { color }]}>{percent}%</Text>
        </View>
      </View>

      {/* Frequency card */}
      <View style={[shared.card, styles.freqCard]}>
        <Text style={styles.freqLabel}>Current frequency</Text>
        <Text style={[styles.freqValue, { color }]}>
          {currentFreq >= 1000 ? `${currentFreq / 1000}k` : currentFreq}
          <Text style={styles.freqUnit}> Hz</Text>
        </Text>
        <SoundWave active={playing} color={color}/>
        <Text style={styles.freqStatus}>
          {playing ? "Listen carefully…" : "Preparing tone…"}
        </Text>
      </View>

      {/* Replay */}
      <TouchableOpacity
        style={[styles.replayBtn, (playing || waiting) && styles.disabled]}
        onPress={triggerTone}
        disabled={playing || waiting}
        activeOpacity={0.7}>
        <Text style={styles.replayText}>↻  Replay tone</Text>
      </TouchableOpacity>

      {/* Response buttons */}
      <View style={styles.responseRow}>
        <TouchableOpacity
          style={[shared.btnPrimary, styles.responseBtn,
            heard === true && styles.heardActive,
            { opacity: waiting ? 0.6 : 1 }]}
          onPress={() => handleResponse(true)}
          disabled={playing || waiting}
          activeOpacity={0.85}>
          <Text style={shared.btnPrimaryText}>✓  I heard it</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[shared.btnGhost, styles.responseBtn,
            heard === false && styles.notHeardActive,
            { opacity: waiting ? 0.6 : 1 }]}
          onPress={() => handleResponse(false)}
          disabled={playing || waiting}
          activeOpacity={0.85}>
          <Text style={shared.btnGhostText}>✕  I didn't</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {TEST_FREQUENCIES.map((f, i) => (
          <View key={f} style={[
            styles.dot,
            i === step  ? [styles.dotCurrent, { backgroundColor: color }]  :
            i < step    ? [styles.dotPast,    { backgroundColor: color }]  :
            styles.dotFuture,
          ]}/>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shell:       { alignItems:"center", justifyContent:"center", padding:24 },
  header:      { width:"100%", maxWidth:420, flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:24 },
  earLabel:    { fontSize:11, letterSpacing:2, textTransform:"uppercase", fontFamily:"Courier", marginBottom:4 },
  ringWrap:    { position:"relative", width:64, height:64, alignItems:"center", justifyContent:"center" },
  ringText:    { position:"absolute", fontSize:11, fontFamily:"Courier" },
  freqCard:    { width:"100%", maxWidth:420, alignItems:"center", marginBottom:16, paddingVertical:24 },
  freqLabel:   { fontSize:10, letterSpacing:2, textTransform:"uppercase", color:C.textMuted, fontFamily:"Courier", marginBottom:8 },
  freqValue:   { fontSize:48, fontWeight:"700", fontFamily:"Courier", letterSpacing:-1, marginBottom:4 },
  freqUnit:    { fontSize:18, color:C.textMuted },
  freqStatus:  { fontSize:12, color:C.textMuted, marginTop:4 },
  replayBtn:   { borderWidth:1.5, borderColor:C.borderMid, borderRadius:10, paddingVertical:10, paddingHorizontal:20, marginBottom:16, width:"100%", maxWidth:420, alignItems:"center" },
  replayText:  { color:C.textBody, fontSize:13, fontWeight:"600" },
  disabled:    { opacity:0.4 },
  responseRow: { width:"100%", maxWidth:420, flexDirection:"row", gap:12, marginBottom:24 },
  responseBtn: { flex:1, width:undefined },
  heardActive: { backgroundColor:"#065f46", borderColor:"#10b981" },
  notHeardActive: { backgroundColor:C.bgCard },
  dots:        { flexDirection:"row", gap:5, justifyContent:"center" },
  dot:         { height:7, borderRadius:99, backgroundColor:C.border },
  dotCurrent:  { width:18 },
  dotPast:     { width:7, opacity:0.4 },
  dotFuture:   { width:7 },
});
