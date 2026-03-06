import React, { FC } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Line, Circle, Path, Text as SvgText, G } from "react-native-svg";
import { Thresholds, Zone } from "../types";
import { STANDARD_FREQS, FREQ_LABELS, ZONES } from "../utils/hearing";
import { C, F } from "../theme";

interface Props {
  leftData:  Thresholds;
  rightData: Thresholds;
}

const W = 320;   // chart width
const H = 220;   // chart height
const PAD = { top: 16, right: 20, bottom: 36, left: 42 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top  - PAD.bottom;

const DB_MIN = -10, DB_MAX = 120;
const FREQ_LOG_MIN = Math.log10(200), FREQ_LOG_MAX = Math.log10(10000);

function xPos(freq: number): number {
  return PAD.left + ((Math.log10(freq) - FREQ_LOG_MIN) / (FREQ_LOG_MAX - FREQ_LOG_MIN)) * CHART_W;
}

function yPos(db: number): number {
  return PAD.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_H;
}

const DB_TICKS  = [0, 20, 40, 60, 80, 100, 120];
const GRID_FREQS = STANDARD_FREQS;

export const AudiogramChart: FC<Props> = ({ leftData, rightData }) => {
  // Build polyline points
  const leftPoints  = STANDARD_FREQS.map(f => ({ f, db: leftData[f]  })).filter(p => p.db != null) as { f:number; db:number }[];
  const rightPoints = STANDARD_FREQS.map(f => ({ f, db: rightData[f] })).filter(p => p.db != null) as { f:number; db:number }[];

  return (
    <View>
      <Svg width={W} height={H}>
        {/* Horizontal grid lines */}
        {DB_TICKS.map(db => (
          <Line key={db} x1={PAD.left} y1={yPos(db)} x2={PAD.left + CHART_W} y2={yPos(db)}
            stroke={C.border} strokeWidth={1} strokeDasharray="3,4"/>
        ))}

        {/* Vertical grid lines */}
        {GRID_FREQS.map(f => (
          <Line key={f} x1={xPos(f)} y1={PAD.top} x2={xPos(f)} y2={PAD.top + CHART_H}
            stroke={C.border} strokeWidth={1} strokeDasharray="2,4"/>
        ))}

        {/* Axes */}
        <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CHART_H} stroke={C.borderMid} strokeWidth={1.5}/>
        <Line x1={PAD.left} y1={PAD.top + CHART_H} x2={PAD.left + CHART_W} y2={PAD.top + CHART_H} stroke={C.borderMid} strokeWidth={1.5}/>

        {/* Y-axis labels */}
        {DB_TICKS.map(db => (
          <SvgText key={db} x={PAD.left - 6} y={yPos(db) + 4} fill={C.textMuted} fontSize={9}
            textAnchor="end" fontFamily={F.mono}>{db}</SvgText>
        ))}

        {/* X-axis labels */}
        {STANDARD_FREQS.map(f => (
          <SvgText key={f} x={xPos(f)} y={PAD.top + CHART_H + 14} fill={C.textMuted}
            fontSize={9} textAnchor="middle" fontFamily={F.mono}>{FREQ_LABELS[f]}</SvgText>
        ))}

        {/* Axis titles */}
        <SvgText x={PAD.left + CHART_W / 2} y={H - 2} fill={C.textMuted} fontSize={9}
          textAnchor="middle" fontFamily={F.mono}>Hz</SvgText>
        <SvgText x={10} y={PAD.top + CHART_H / 2} fill={C.textMuted} fontSize={9}
          textAnchor="middle" fontFamily={F.mono}
          transform={`rotate(-90, 10, ${PAD.top + CHART_H / 2})`}>dB HL</SvgText>

        {/* Left ear line */}
        {leftPoints.length > 1 && leftPoints.map((p, i) => {
          if (i === 0) return null;
          const prev = leftPoints[i - 1];
          return <Line key={i} x1={xPos(prev.f)} y1={yPos(prev.db)} x2={xPos(p.f)} y2={yPos(p.db)}
            stroke={C.cyan} strokeWidth={2.5}/>;
        })}

        {/* Right ear line */}
        {rightPoints.length > 1 && rightPoints.map((p, i) => {
          if (i === 0) return null;
          const prev = rightPoints[i - 1];
          return <Line key={i} x1={xPos(prev.f)} y1={yPos(prev.db)} x2={xPos(p.f)} y2={yPos(p.db)}
            stroke={C.pink} strokeWidth={2.5}/>;
        })}

        {/* Left ear dots — × symbol */}
        {leftPoints.map(p => (
          <SvgText key={p.f} x={xPos(p.f)} y={yPos(p.db) + 5}
            fill={C.cyan} fontSize={14} textAnchor="middle" fontWeight="bold">×</SvgText>
        ))}

        {/* Right ear dots — △ symbol */}
        {rightPoints.map(p => {
          const cx = xPos(p.f), cy = yPos(p.db);
          return (
            <Path key={p.f}
              d={`M${cx},${cy-7} L${cx+6},${cy+5} L${cx-6},${cy+5} Z`}
              fill="none" stroke={C.pink} strokeWidth={2}/>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <SvgText style={styles.legendSym} />
          <Text style={[styles.legendLabel, { color: C.cyan }]}>× Left Ear</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendLabel, { color: C.pink }]}>△ Right Ear</Text>
        </View>
      </View>

      {/* Zone key */}
      <View style={styles.zoneRow}>
        {ZONES.map(z => (
          <View key={z.label} style={styles.zoneItem}>
            <View style={[styles.zoneSwatch, { backgroundColor: z.color }]}/>
            <Text style={styles.zoneText}>{z.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  legend: { flexDirection:"row", justifyContent:"center", gap:20, marginTop:8 },
  legendItem: { flexDirection:"row", alignItems:"center", gap:4 },
  legendSym: {},
  legendLabel: { fontSize:12, fontFamily: F.mono },
  zoneRow: { flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:8, marginTop:10 },
  zoneItem: { flexDirection:"row", alignItems:"center", gap:4 },
  zoneSwatch: { width:8, height:8, borderRadius:2 },
  zoneText: { fontSize:9, color:C.textMuted, fontFamily: F.mono },
});
