import { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Button,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';

export default function App() {
  const [log, setLog] = useState<string[]>([]);
  const [reachable, setReachable] = useState(false);

  const append = (line: string) => setLog((prev) => [...prev.slice(-20), line]);

  useEffect(() => {
    WatchConnectivity.activate()
      .then((state) => {
        setReachable(state.isReachable);
        append(`activated: ${state.activationState}`);
      })
      .catch((e) => append(`activate error: ${e?.message}`));

    const subs = [
      WatchConnectivity.on('reachabilityChanged', (r) => {
        setReachable(r);
        append(`reachable: ${r}`);
      }),
      WatchConnectivity.on('message', ({ content }) => {
        append(`recv message: ${JSON.stringify(content)}`);
        // Reply only when peer expects one — facade hides replyId so
        // returning a value is enough.
        return { pong: content.ping ?? null };
      }),
      WatchConnectivity.on('applicationContext', (ctx) => {
        append(`recv context: ${JSON.stringify(ctx)}`);
      }),
      WatchConnectivity.on('userInfo', (info) => {
        append(`recv userInfo: ${JSON.stringify(info)}`);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const sendPing = async () => {
    const ts = Date.now();
    try {
      const reply = await WatchConnectivity.sendMessage(
        { ping: ts },
        { expectReply: true, timeoutMs: 5_000 }
      );
      append(`reply: ${JSON.stringify(reply)}`);
    } catch (e) {
      append(`send error: ${(e as Error).message}`);
    }
  };

  const pushContext = async () => {
    try {
      await WatchConnectivity.updateApplicationContext({
        user: 'maxence',
        ts: Date.now(),
      });
      append('context pushed');
    } catch (e) {
      append(`context error: ${(e as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>WatchConnectivity demo</Text>
      <Text>reachable: {String(reachable)}</Text>
      <View style={styles.row}>
        <Button title="Send ping" onPress={sendPing} />
        <Button title="Push context" onPress={pushContext} />
      </View>
      <ScrollView style={styles.log}>
        {log.map((line, i) => (
          <Text key={i} style={styles.line}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  log: { flex: 1, backgroundColor: '#f4f4f4', padding: 8 },
  line: { fontFamily: 'Menlo', fontSize: 11 },
});
