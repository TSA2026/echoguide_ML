import React, { FC, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ear } from "../types";
import { C, shared } from "../theme";

interface Props { ear: Ear; onBegin: () => void; }

export const EarIntroScreen: FC<Props> = ({ ear, onBegin }) => {
  const isLeft   = ear === "left";
  const color    = isLeft ? C.cyan : C.pink;

  const eyebrowAnim = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const subAnim     = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(eyebrowAnim, { toValue:1, duration:500, useNativeDriver:true, delay:100 }),
      Animated.timing(iconAnim,    { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(titleAnim,   { toValue:1, duration:600, useNativeDriver:true }),
      Animated.timing(subAnim,     { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(btnAnim,     { toValue:1, duration:500, useNativeDriver:true }),
    ]).start();
  }, [ear]);

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[28,0] }) }],
  });

  const scaleIn = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange:[0,1], outputRange:[0.7,1] }) }],
  });

  return (
    <View style={[shared.screen, styles.container]}>
      <Animated.Text style={[styles.eyebrow, { color }, fadeUp(eyebrowAnim)]}>
        {isLeft ? "Starting with" : "Almost done —"}
      </Animated.Text>

      <Animated.Text style={[styles.earIcon, scaleIn(iconAnim)]}>
        {isLeft ? "👂" : "👂"}
      </Animated.Text>

      <Animated.Text style={[shared.h2, styles.title, fadeUp(titleAnim)]}>
        {isLeft
          ? "Let's begin with\nyour left ear."
          : "Now, your\nright ear."}
      </Animated.Text>

      <Animated.Text style={[shared.body, styles.sub, fadeUp(subAnim)]}>
        {isLeft
          ? "You'll hear a series of tones. Press the button each time you hear one — even if it's very faint."
          : "Same thing — press the button every time you hear a tone, no matter how quiet."}
      </Animated.Text>

      <Animated.View style={[styles.btnWrap, fadeUp(btnAnim)]}>
        <TouchableOpacity style={shared.btnPrimary} onPress={onBegin} activeOpacity={0.85}>
          <Text style={shared.btnPrimaryText}>Begin →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems:"center", justifyContent:"center", paddingHorizontal:32, paddingVertical:48 },
  eyebrow:   { fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:24, fontFamily:"Courier" },
  earIcon:   { fontSize:72, marginBottom:28 },
  title:     { textAlign:"center", marginBottom:16 },
  sub:       { textAlign:"center", marginBottom:48, maxWidth:340 },
  btnWrap:   { width:"100%", maxWidth:280 },
});
