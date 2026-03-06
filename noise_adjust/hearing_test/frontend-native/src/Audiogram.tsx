import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import type { AudiogramData, Thresholds } from "./types"

interface Props {
  data: AudiogramData
  thresholds: Record<string, Record<string, number>> 
}

export default function Audiogram({ data, thresholds }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch("http://192.168.1.100:8000/generate_audiogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: thresholds })
    })
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onload = () => {
          setImageUri(reader.result as string)
          setLoading(false)
        }
        reader.readAsDataURL(blob)
      })
      .catch(err => {
        console.error("Audiogram fetch failed:", err)
        setError("Failed to load audiogram")
        setLoading(false)
      })
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Audiogram</Text>

      {loading && <ActivityIndicator size="large" color="#007AFF" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEar}>Left</Text>
          <Text style={styles.summaryDb}>{data.summary.left.average_dBHL} dBHL</Text>
          <Text style={styles.summaryLabel}>{data.summary.left.classification}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEar}>Right</Text>
          <Text style={styles.summaryDb}>{data.summary.right.average_dBHL} dBHL</Text>
          <Text style={styles.summaryLabel}>{data.summary.right.classification}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { alignItems: "center", padding: 16 },
  title:        { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  image:        { width: 350, height: 250, marginBottom: 16 },
  error:        { color: "red", marginBottom: 12 },
  summary:      { flexDirection: "row", gap: 16, marginTop: 8 },
  summaryCard:  { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, alignItems: "center" },
  summaryEar:   { fontSize: 14, color: "#666", marginBottom: 4 },
  summaryDb:    { fontSize: 24, fontWeight: "bold" },
  summaryLabel: { fontSize: 13, color: "#666", marginTop: 4 },
})