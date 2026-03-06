import React, { FC, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { C, shared } from "../theme";

interface Props { onStart: () => void; }

const CHECKLIST = [
  { icon:"🔇", label:"Find a quiet room",              desc:"Background noise affects the results." },
  { icon:"🔉", label:"Set device volume to mid",        desc:"Not too loud, not too quiet — about 50%." },
  { icon:"🎧", label:"Put on your Overhear device",     desc:"Make sure it's seated comfortably on both ears." },
];

export const WelcomeScreen: FC<Props> = ({ onStart }) => {
  const eyebrowAnim = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;
  const itemAnims   = useRef(CHECKLIST.map(() => new Animated.Value(0))).current;
  const footerAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(eyebrowAnim, { toValue:1, duration:600, useNativeDriver:true, delay:200 }),
      Animated.timing(titleAnim,   { toValue:1, duration:700, useNativeDriver:true }),
      Animated.timing(cardAnim,    { toValue:1, duration:600, useNativeDriver:true }),
      Animated.stagger(300, itemAnims.map(a =>
        Animated.timing(a, { toValue:1, duration:500, useNativeDriver:true })
      )),
      Animated.timing(footerAnim, { toValue:1, duration:500, useNativeDriver:true }),
    ]).start();
  }, []);

  const fadeUp = (anim: Animated.Value, extra = {}) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[24,0] }) }],
    ...extra,
  });

  return (
    <View style={[shared.screen, styles.container]}>
      <Animated.Text style={[styles.eyebrow, fadeUp(eyebrowAnim)]}>
        Before you start the hearing test
      </Animated.Text>

      <Animated.Text style={[shared.h1, styles.title, fadeUp(titleAnim)]}>
        Get ready.
      </Animated.Text>

      <Animated.View style={[shared.card, styles.card, fadeUp(cardAnim)]}>
        {CHECKLIST.map(({ icon, label, desc }, i) => (
          <Animated.View key={label} style={[styles.item, fadeUp(itemAnims[i]),
            i < CHECKLIST.length - 1 && styles.itemBorder]}>
            <Text style={styles.itemIcon}>{icon}</Text>
            <View style={styles.itemText}>
              <Text style={styles.itemLabel}>{label}</Text>
              <Text style={styles.itemDesc}>{desc}</Text>
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.footer, fadeUp(footerAnim)]}>
        <Text style={styles.readyText}>Are you ready?</Text>
        <TouchableOpacity style={shared.btnCta} onPress={onStart} activeOpacity={0.85}>
          <Text style={shared.btnCtaText}>Start Now</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems:"center", justifyContent:"center", paddingHorizontal:24, paddingVertical:48 },
  eyebrow:   { fontSize:11, letterSpacing:2, textTransform:"uppercase", color:C.cyan, marginBottom:16, fontFamily:"Courier" },
  title:     { marginBottom:32, textAlign:"center" },
  card:      { width:"100%", marginBottom:36 },
  item:      { flexDirection:"row", alignItems:"flex-start", gap:14, paddingVertical:16 },
  itemBorder:{ borderBottomWidth:1, borderBottomColor:C.border },
  itemIcon:  { fontSize:22, minWidth:28, marginTop:1 },
  itemText:  { flex:1 },
  itemLabel: { fontSize:16, fontWeight:"600", color:C.text, marginBottom:3 },
  itemDesc:  { fontSize:14, color:C.textBody, lineHeight:20 },
  footer:    { width:"100%", alignItems:"center", gap:14 },
  readyText: { fontSize:14, color:C.textMuted, letterSpacing:0.5 },
});
