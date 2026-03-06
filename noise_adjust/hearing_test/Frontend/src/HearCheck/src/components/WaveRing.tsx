import React, { useEffect, useRef, FC } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C } from "../theme";

/* ─── Animated sound wave bars ──────────────────────────────────────────────── */
interface SoundWaveProps { active: boolean; color: string; }

export const SoundWave: FC<SoundWaveProps> = ({ active, color }) => {
  const bars = 12;
  const anims = useRef(Array.from({ length: bars }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (active) {
      const animations = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 60),
            Animated.timing(anim, { toValue: 1,   duration: 300 + (i % 3) * 120, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 300 + (i % 3) * 120, useNativeDriver: true }),
          ])
        )
      );
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      anims.forEach(a => Animated.timing(a, { toValue: 0.15, duration: 300, useNativeDriver: true }).start());
    }
  }, [active]);

  return (
    <View style={waveStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              backgroundColor: active ? color : C.border,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: 4,
  },
  bar: {
    width: 4,
    height: 28,
    borderRadius: 99,
  },
});

/* ─── SVG progress ring ──────────────────────────────────────────────────────── */
interface ProgressRingProps { percent: number; color?: string; size?: number; strokeWidth?: number; }

export const ProgressRing: FC<ProgressRingProps> = ({
  percent, color = C.cyan, size = 64, strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ * (1 - percent / 100);

  const animVal = useRef(new Animated.Value(circ)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: offset,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={C.border} strokeWidth={strokeWidth}/>
      <AnimatedCircle
        cx={size/2} cy={size/2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${circ}`}
        strokeDashoffset={animVal}
        strokeLinecap="round"
      />
    </Svg>
  );
};
