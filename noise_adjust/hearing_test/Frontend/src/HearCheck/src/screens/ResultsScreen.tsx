import React, { FC, useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from "react-native";
import { BoolResults, SaveStatus, TabKey, Classification } from "../types";
import {
  boolToThresholds, classifyEar, getAdvice,
  STANDARD_FREQS, FREQ_LABELS, ZONES,
  shareJSON, shareCSV,
} from "../utils/hearing";
import { AudiogramChart } from "../components/AudiogramChart";
import { C, shared } from "../theme";

interface Props {
  leftResults:  BoolResults;
  rightResults: BoolResults;
  sessionId:    string;
  testDate:     string;
  saveStatus:   SaveStatus;
  onRetake:     () => void;
}

export const ResultsScreen: FC<Props> = ({
  leftResults, rightResults, sessionId, testDate, saveStatus, onRetake,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("audiogram");
  const [exporting, setExporting] = useState<string | null>(null);

  const lT = boolToThresholds(leftResults);
  const rT = boolToThresholds(rightResults);
  const lC = classifyEar(lT);
  const rC = classifyEar(rT);
  const fname = `audiogram_${(testDate || "").replace(/[:/\s,]/g, "-")}`;

  // Entrance animations
  const eyebrowAnim = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const clsAnim     = useRef(new Animated.Value(0)).current;
  const chartAnim   = useRef(new Animated.Value(0)).current;
  const recAnim     = useRef(new Animated.Value(0)).current;
  const ctaAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(eyebrowAnim, { toValue:1, duration:500, useNativeDriver:true, delay:100 }),
      Animated.timing(titleAnim,   { toValue:1, duration:600, useNativeDriver:true }),
      Animated.timing(clsAnim,     { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(chartAnim,   { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(recAnim,     { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(ctaAnim,     { toValue:1, duration:500, useNativeDriver:true }),
    ]).start();
  }, []);

  const fadeDown = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[-24,0] }) }],
  });
  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[24,0] }) }],
  });

  const handleExport = async (type: "json" | "csv") => {
    setExporting(type);
    try {
      if (type === "json") {
        await shareJSON({
          session_id: sessionId, date: testDate,
          left_classification: lC.label, right_classification: rC.label,
          left_thresholds_dBHL: lT, right_thresholds_dBHL: rT,
          frequencies_tested_Hz: STANDARD_FREQS,
        }, `${fname}.json`);
      } else {
        await shareCSV(sessionId, testDate, lT, rT, `${fname}.csv`);
      }
    } catch {
      Alert.alert("Export failed", "Could not share the file.");
    }
    setExporting(null);
  };

  const SaveBadge = () => {
    if (!saveStatus) return null;
    const cfg = {
      saving: { text:"Saving…",   color:C.amber  },
      saved:  { text:"✓ Saved",   color:C.green  },
      error:  { text:"Save failed", color:C.red  },
    }[saveStatus];
    return (
      <View style={[styles.badge, { backgroundColor:`${cfg.color}22`, borderColor:`${cfg.color}55` }]}>
        <Text style={[styles.badgeText, { color:cfg.color }]}>{cfg.text}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* Headline */}
      <Animated.Text style={[styles.eyebrow, fadeDown(eyebrowAnim)]}>Test complete</Animated.Text>
      <Animated.Text style={[shared.h2, styles.title, fadeDown(titleAnim)]}>
        {"Hearing test complete.\nHere are your results."}
      </Animated.Text>
      <Animated.View style={[styles.metaRow, fadeDown(titleAnim)]}>
        <Text style={styles.metaText}>{testDate}</Text>
        <SaveBadge/>
      </Animated.View>

      {/* Ear classification cards */}
      <Animated.View style={[styles.clsGrid, fadeUp(clsAnim)]}>
        {([[lC,"Left Ear","#22d3ee","×"],[rC,"Right Ear","#fb7185","△"]] as [Classification,string,string,string][])
          .map(([cls, lbl, color, sym]) => (
            <View key={lbl} style={[shared.card, styles.clsCard]}>
              <Text style={[styles.clsSym, { color }]}>{sym}</Text>
              <View>
                <Text style={[shared.label, styles.clsEarLabel]}>{lbl}</Text>
                <Text style={[styles.clsResult, { color: cls.color }]}>{cls.label}</Text>
              </View>
            </View>
          ))}
      </Animated.View>

      {/* Tabs + Chart */}
      <Animated.View style={[styles.section, fadeUp(chartAnim)]}>
        <View style={styles.tabs}>
          {([["audiogram","Audiogram"],["table","Data Table"]] as [TabKey,string][]).map(([key,lbl]) => (
            <TouchableOpacity key={key} style={[styles.tab, activeTab===key && styles.tabActive]}
              onPress={() => setActiveTab(key)} activeOpacity={0.8}>
              <Text style={[styles.tabText, activeTab===key && styles.tabTextActive]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "audiogram" && (
          <View style={[shared.card, styles.chartCard]}>
            <Text style={[shared.label, { marginBottom:12 }]}>Hearing Threshold Audiogram</Text>
            <AudiogramChart leftData={lT} rightData={rT}/>
          </View>
        )}

        {activeTab === "table" && (
          <View style={[shared.card, { overflow:"hidden" }]}>
            {/* Header */}
            <View style={styles.tableRow}>
              <Text style={[styles.th, { flex:1.2 }]}>Freq</Text>
              <Text style={[styles.th, { color:C.cyan }]}>Left</Text>
              <Text style={[styles.th, { color:C.pink }]}>Right</Text>
              <Text style={styles.th}>Zone</Text>
            </View>
            {STANDARD_FREQS.map(f => {
              const l=lT[f], r=rT[f];
              const zone=ZONES.find(z=>Math.max(l??0,r??0)<=z.max)??ZONES[ZONES.length-1];
              return (
                <View key={f} style={styles.tableRow}>
                  <Text style={[styles.td, { flex:1.2 }]}>{FREQ_LABELS[f]} Hz</Text>
                  <Text style={[styles.td, { color:C.cyan }]}>{l!=null?`${l} dB`:"—"}</Text>
                  <Text style={[styles.td, { color:C.pink }]}>{r!=null?`${r} dB`:"—"}</Text>
                  <View style={[styles.zoneBadge, { backgroundColor:`${zone.color}22` }]}>
                    <Text style={[styles.zoneText, { color:zone.color }]}>{zone.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Recommendations */}
      <Animated.View style={[styles.section, fadeUp(recAnim)]}>
        <Text style={[shared.label, styles.sectionTitle]}>Recommendations</Text>

        {([[lC,"Left","left"],[rC,"Right","right"]] as [Classification,string,string][]).map(([cls,earLabel,side]) => (
          <View key={earLabel} style={[shared.card, styles.recCard,
            { borderLeftColor: side==="left"?C.cyan:C.pink }]}>
            <Text style={[shared.label, styles.recEar,
              { color: side==="left"?C.cyan:C.pink }]}>{earLabel} Ear — {cls.label}</Text>
            <Text style={[shared.body, { fontSize:14 }]}>{getAdvice(cls.grade)}</Text>
          </View>
        ))}

        <View style={[shared.card, styles.recCard, { borderLeftColor:C.amber }]}>
          <Text style={[shared.label, styles.recEar, { color:C.amber }]}>⚠ Disclaimer</Text>
          <Text style={shared.muted}>
            This is a screening tool only. It does not replace a professional audiological evaluation.
            If you have concerns, please consult a licensed audiologist.
          </Text>
        </View>
      </Animated.View>

      {/* Export */}
      <View style={styles.exportRow}>
        {(["json","csv"] as const).map(type => (
          <TouchableOpacity key={type} style={[shared.btnGhost, styles.exportBtn]}
            onPress={() => handleExport(type)} disabled={!!exporting} activeOpacity={0.8}>
            <Text style={shared.btnGhostText}>
              {exporting===type ? "…" : `⬇ ${type.toUpperCase()}`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[shared.btnGhost, styles.exportBtn]} onPress={onRetake} activeOpacity={0.8}>
          <Text style={[shared.btnGhostText, { color:C.textMuted }]}>↩ Retake</Text>
        </TouchableOpacity>
      </View>

      {/* Final CTA */}
      <Animated.View style={[styles.ctaSection, fadeUp(ctaAnim)]}>
        <Text style={styles.ctaText}>
          Are you ready to take your hearing to the next level?
        </Text>
        <TouchableOpacity style={shared.btnCta}
          onPress={() => Alert.alert("Coming soon", "Navigate to next step here.")}
          activeOpacity={0.85}>
          <Text style={shared.btnCtaText}>Let's Go</Text>
        </TouchableOpacity>
      </Animated.View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:    { padding:24, paddingBottom:60, alignItems:"center" },
  eyebrow:      { fontSize:11, letterSpacing:2, color:C.cyan, textTransform:"uppercase", fontFamily:"Courier", marginBottom:12, alignSelf:"flex-start" },
  title:        { textAlign:"left", marginBottom:10, alignSelf:"flex-start" },
  metaRow:      { flexDirection:"row", alignItems:"center", gap:10, marginBottom:32, alignSelf:"flex-start", flexWrap:"wrap" },
  metaText:     { fontSize:12, color:C.textMuted, fontFamily:"Courier" },
  badge:        { borderRadius:99, borderWidth:1, paddingHorizontal:10, paddingVertical:2 },
  badgeText:    { fontSize:11, fontFamily:"Courier" },
  clsGrid:      { flexDirection:"row", gap:12, marginBottom:24, width:"100%" },
  clsCard:      { flex:1, flexDirection:"row", alignItems:"center", gap:12, paddingVertical:16 },
  clsSym:       { fontSize:24, minWidth:26, textAlign:"center" },
  clsEarLabel:  { marginBottom:3 },
  clsResult:    { fontSize:15, fontWeight:"700" },
  section:      { width:"100%", marginBottom:24 },
  sectionTitle: { marginBottom:12 },
  tabs:         { flexDirection:"row", gap:2, backgroundColor:C.bgCard, padding:4, borderRadius:10, marginBottom:14 },
  tab:          { flex:1, paddingVertical:9, borderRadius:8, alignItems:"center" },
  tabActive:    { backgroundColor:C.blueBg },
  tabText:      { fontSize:13, fontWeight:"600", color:C.textMuted },
  tabTextActive:{ color:C.blueLt },
  chartCard:    { paddingHorizontal:8, paddingTop:16, paddingBottom:8 },
  tableRow:     { flexDirection:"row", alignItems:"center", borderBottomWidth:1, borderBottomColor:"#060e1e", paddingVertical:10, paddingHorizontal:12 },
  th:           { flex:1, fontSize:10, color:C.textMuted, fontFamily:"Courier", letterSpacing:1, textAlign:"center" },
  td:           { flex:1, fontSize:12, color:C.textBody, fontFamily:"Courier", textAlign:"center" },
  zoneBadge:    { flex:1, borderRadius:99, paddingVertical:2, paddingHorizontal:6, alignItems:"center" },
  zoneText:     { fontSize:10, fontFamily:"Courier" },
  recCard:      { borderLeftWidth:3, marginBottom:12 },
  recEar:       { marginBottom:6 },
  exportRow:    { flexDirection:"row", gap:8, width:"100%", marginBottom:28 },
  exportBtn:    { flex:1, paddingVertical:12, paddingHorizontal:0 },
  ctaSection:   { width:"100%", borderTopWidth:1, borderTopColor:C.border, paddingTop:28, alignItems:"center", gap:16 },
  ctaText:      { fontSize:18, fontWeight:"600", color:C.text, textAlign:"center", lineHeight:26 },
});
