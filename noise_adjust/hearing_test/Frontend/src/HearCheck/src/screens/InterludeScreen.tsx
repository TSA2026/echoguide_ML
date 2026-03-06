import React, { FC, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Ear } from "../types";
import { C, shared } from "../theme";

interface Props { completedEar: Ear; onContinue: () => void; }

export const InterludeScreen: FC<Props> = ({ completedEar, onContinue }) => {
  const doneColor = completedEar === "left" ? C.cyan : C.pink;

  const checkAnim  = useRef(new Animated.Value(0)).current;
  const doneAnim   = useRef(new Animated.Value(0)).current;
  const nextAnim   = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(0)).current;

  // Animated stroke for checkmark
  const strokeAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(checkAnim,  { toValue:1, duration:500, useNativeDriver:true, delay:100 }),
      Animated.timing(doneAnim,   { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(nextAnim,   { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(cardAnim,   { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(btnAnim,    { toValue:1, duration:400, useNativeDriver:true }),
    ]).start();
  }, []);

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[24,0] }) }],
  });

  const scaleIn = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange:[0,1], outputRange:[0.6,1] }) }],
  });

  return (
    <View style={[shared.screen, styles.container]}>
      {/* Animated check circle */}
      <Animated.View style={[styles.checkWrap, scaleIn(checkAnim)]}>
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={42} fill="none" stroke={doneColor} strokeWidth={3} opacity={0.25}/>
          <Circle cx={48} cy={48} r={42} fill="none" stroke={doneColor} strokeWidth={3}/>
          <Polyline
            points="28,48 42,62 68,34"
            fill="none"
            stroke={doneColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      <Animated.Text style={[shared.h2, styles.doneText, { color: doneColor }, fadeUp(doneAnim)]}>
        Done!
      </Animated.Text>

      <Animated.Text style={[shared.body, styles.nextText, fadeUp(nextAnim)]}>
        Now let's test your right ear.
      </Animated.Text>

      <Animated.View style={[shared.card, styles.card, fadeUp(cardAnim)]}>
        <Text style={[shared.label, styles.cardLabel]}>Next up</Text>
        <Text style={styles.cardEar}>Right Ear →</Text>
        <Text style={shared.muted}>
          Make sure the device is seated properly before continuing.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.btnWrap, fadeUp(btnAnim)]}>
        <TouchableOpacity style={shared.btnPrimary} onPress={onContinue} activeOpacity={0.85}>
          <Text style={shared.btnPrimaryText}>Continue →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems:"center", justifyContent:"center", paddingHorizontal:28, paddingVertical:48 },
  checkWrap: { marginBottom:24 },
  doneText:  { marginBottom:8, textAlign:"center" },
  nextText:  { textAlign:"center", marginBottom:32, maxWidth:320 },
  card:      { width:"100%", marginBottom:32 },
  cardLabel: { marginBottom:8 },
  cardEar:   { fontSize:18, fontWeight:"700", color:C.pink, marginBottom:8 },
  btnWrap:   { width:"100%", maxWidth:280 },
});
