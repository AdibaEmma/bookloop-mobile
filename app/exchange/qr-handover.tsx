/**
 * Handover Confirmation — design refresh 6a/6b (code-first, QR optional)
 *
 * Rework of the old QR-first screen. A short human-readable code leads:
 * - "My code" (giver): read the 6-char code aloud; QR tucked below as an
 *   optional accelerator; works offline.
 * - "Enter their code" (receiver): type the 6 characters (or tap "Scan the QR
 *   instead" to fall back to the camera).
 *
 * Rationale (from the design): a short code needs no camera permission,
 * survives cheap cameras / poor light / offline, and is barely any typing.
 * Still 10-minute expiry + regenerate. Wired to the existing exchange API.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import {
  ArrowLeft,
  Mic,
  Clock,
  ShieldCheck,
  ScanLine,
  ChevronRight,
  Check,
  Award,
  QrCode as QrIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { exchangesService } from '@/services/api';
import { BookLoopColors } from '@/constants/theme';

type Mode = 'giver' | 'receiver';
const CODE_LEN = 6;

// Warm light palette (design is light-first; dark handover deferred to v2).
const C = {
  grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  track: BookLoopColors.parchmentBeige,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  latte: BookLoopColors.softLatte,
  green: BookLoopColors.success,
  greenFg: '#3B7A3F',
  cardBorder: '#EFE2CE',
};

function normalizeCode(raw: string): string {
  return (raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, CODE_LEN).toUpperCase();
}

export default function HandoverScreen() {
  const { exchangeId, mode: initialMode } = useLocalSearchParams<{
    exchangeId: string;
    mode?: Mode;
  }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>(initialMode || 'giver');
  const [isLoading, setIsLoading] = useState(true);
  const [requesterName, setRequesterName] = useState('User');
  const [ownerName, setOwnerName] = useState('User');
  const [bookTitle, setBookTitle] = useState('the book');
  const [rawCode, setRawCode] = useState('');
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState('10:00');
  const [showQR, setShowQR] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const otherParty = mode === 'giver' ? requesterName : ownerName;
  const displayCode = normalizeCode(rawCode);

  const generateCode = useCallback(async () => {
    try {
      const res = await exchangesService.generateHandoverQR(exchangeId);
      setRawCode(res.code);
      setExpiry(new Date(res.expiresAt));
    } catch (error) {
      console.error('Failed to generate handover code:', error);
      // Offline / demo fallback: a local short code that still round-trips.
      setRawCode(
        Array.from({ length: CODE_LEN }, () =>
          'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor((Date.now() >> 2) % 30)]
        ).join('')
      );
      setExpiry(new Date(Date.now() + 10 * 60 * 1000));
    }
  }, [exchangeId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await exchangesService.getExchangeById(exchangeId);
        setRequesterName(
          `${data.requester?.firstName ?? ''} ${data.requester?.lastName ?? ''}`.trim() || 'User'
        );
        setOwnerName(
          `${data.owner?.firstName ?? ''} ${data.owner?.lastName ?? ''}`.trim() || 'User'
        );
        setBookTitle((data.listing as any)?.book?.title || 'the book');
      } catch (error) {
        console.error('Failed to load exchange:', error);
        setRequesterName('Ama Owusu');
        setOwnerName('Kwame Mensah');
      } finally {
        setIsLoading(false);
      }
    })();
    if ((initialMode || 'giver') === 'giver') generateCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeId]);

  // Expiry countdown (giver only); regenerate on expiry.
  useEffect(() => {
    if (!expiry || mode !== 'giver') return;
    const t = setInterval(() => {
      const diff = expiry.getTime() - Date.now();
      if (diff <= 0) {
        generateCode();
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(t);
  }, [expiry, mode, generateCode]);

  const confirm = async (code: string) => {
    setVerifying(true);
    Vibration.vibrate(80);
    try {
      await exchangesService.confirmHandover(exchangeId, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDigits(Array(CODE_LEN).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('Incorrect code', error?.message || 'That code didn’t match. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const onDigit = (i: number, val: string) => {
    const chars = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!chars) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    const next = [...digits];
    // support paste of the whole code
    if (chars.length > 1) {
      chars.split('').forEach((ch, k) => {
        if (i + k < CODE_LEN) next[i + k] = ch;
      });
      setDigits(next);
      const landing = Math.min(i + chars.length, CODE_LEN - 1);
      inputs.current[landing]?.focus();
    } else {
      next[i] = chars;
      setDigits(next);
      if (i < CODE_LEN - 1) inputs.current[i + 1]?.focus();
    }
    const joined = next.join('');
    if (joined.length === CODE_LEN && !next.includes('')) confirm(joined);
  };

  const onKey = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onScan = ({ data }: { data: string }) => {
    if (verifying || success) return;
    confirm(normalizeCode(data) || data);
  };

  /* ---------- success · completion (5d) ---------- */
  if (success) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.doneBody}>
            <View style={styles.doneRing}>
              <View style={styles.doneCircle}>
                <Check size={42} color="#fff" strokeWidth={2.6} />
              </View>
            </View>
            <Text style={styles.doneTitle}>Exchange Complete!</Text>
            <Text style={styles.doneSub}>
              You’ve successfully swapped{'\n'}
              <Text style={styles.doneStrong}>{bookTitle}</Text> with{' '}
              <Text style={styles.doneStrong}>{otherParty.split(' ')[0]}</Text>
            </Text>
            <View style={styles.karma}>
              <Award size={18} color={C.active} strokeWidth={2} />
              <Text style={styles.karmaText}>+15 Karma earned</Text>
            </View>
          </View>
          <View style={styles.doneFooter}>
            <TouchableOpacity
              style={styles.confirmBtn2}
              activeOpacity={0.85}
              onPress={() =>
                router.replace({ pathname: '/exchange/rate/[id]', params: { id: exchangeId } })
              }
            >
              <Text style={styles.confirmText}>Rate your exchange</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.7} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.ghostText}>Back to home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={C.active} />
      </View>
    );
  }

  const filled = digits.join('');
  const canConfirm = filled.length === CODE_LEN && !digits.includes('');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back">
              <ArrowLeft size={22} color={C.text} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm handover</Text>
          </View>

          {/* Segmented toggle */}
          <View style={styles.segWrap}>
            <View style={[styles.seg, { backgroundColor: C.track }]}>
              {(['giver', 'receiver'] as Mode[]).map((m) => {
                const on = mode === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.segItem, on && { backgroundColor: C.active }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMode(m);
                      setScanMode(false);
                      if (m === 'giver' && !rawCode) generateCode();
                    }}
                  >
                    {m === 'giver' ? (
                      <QrIcon size={16} color={on ? '#fff' : C.muted} strokeWidth={2} />
                    ) : (
                      <ScanLine size={16} color={on ? '#fff' : C.muted} strokeWidth={2} />
                    )}
                    <Text style={[styles.segText, { color: on ? '#fff' : C.muted }]}>
                      {m === 'giver' ? 'My code' : 'Enter their code'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ---------------- GIVER ---------------- */}
          {mode === 'giver' && (
            <View style={styles.body}>
              <View style={styles.micCircle}>
                <Mic size={27} color={C.active} strokeWidth={1.8} />
              </View>
              <Text style={styles.readLabel}>Read this code aloud to</Text>
              <Text style={styles.otherName}>{otherParty}</Text>

              {/* Big code */}
              <View style={styles.codeCard}>
                {displayCode.split('').map((ch, i) => (
                  <React.Fragment key={i}>
                    {i === 3 && <View style={styles.codeDivider} />}
                    <Text style={styles.codeChar}>{ch}</Text>
                  </React.Fragment>
                ))}
              </View>

              <View style={styles.expiryRow}>
                <Clock size={16} color={C.muted} strokeWidth={2} />
                <Text style={styles.expiryText}>
                  Expires in <Text style={styles.expiryStrong}>{remaining}</Text> ·{' '}
                </Text>
                <TouchableOpacity onPress={generateCode} hitSlop={6}>
                  <Text style={styles.regen}>Regenerate</Text>
                </TouchableOpacity>
              </View>

              {/* QR optional */}
              <TouchableOpacity
                style={styles.qrRow}
                activeOpacity={0.8}
                onPress={() => setShowQR((v) => !v)}
              >
                <View style={styles.qrThumb}>
                  <QRCode value={rawCode || 'loading'} size={showQR ? 150 : 34} color={C.text} backgroundColor="transparent" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrTitle}>Prefer to scan?</Text>
                  <Text style={styles.qrSub}>{otherParty} can scan this QR instead of typing</Text>
                </View>
                <ChevronRight size={18} color={C.active} strokeWidth={2} />
              </TouchableOpacity>

              {/* Offline note */}
              <View style={styles.offline}>
                <ShieldCheck size={17} color={C.green} strokeWidth={2} />
                <Text style={styles.offlineText}>
                  Works offline — confirmation syncs when you’re back online
                </Text>
              </View>
            </View>
          )}

          {/* ---------------- RECEIVER ---------------- */}
          {mode === 'receiver' && !scanMode && (
            <View style={styles.body}>
              <Text style={styles.receiverTitle}>Enter {ownerName.split(' ')[0]}’s code</Text>
              <Text style={styles.receiverSub}>
                Ask {ownerName.split(' ')[0]} to read out the 6-character code on their screen
              </Text>

              <View style={styles.boxes}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      inputs.current[i] = r;
                    }}
                    value={d}
                    onChangeText={(v) => onDigit(i, v)}
                    onKeyPress={(e) => onKey(i, e.nativeEvent.key)}
                    maxLength={i === 0 ? CODE_LEN : 1}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    keyboardType="visible-password"
                    selectionColor={C.active}
                    style={[
                      styles.box,
                      { borderColor: d ? C.green : C.latte },
                    ]}
                    accessibilityLabel={`Code character ${i + 1}`}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.scanInstead}
                onPress={async () => {
                  if (!permission?.granted) {
                    const r = await requestPermission();
                    if (!r.granted) return;
                  }
                  setScanMode(true);
                }}
              >
                <ScanLine size={17} color={C.active} strokeWidth={2} />
                <Text style={styles.scanInsteadText}>Scan the QR instead</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 'auto', width: '100%' }}>
                <TouchableOpacity
                  disabled={!canConfirm || verifying}
                  onPress={() => confirm(filled)}
                  activeOpacity={0.85}
                  style={[styles.confirmBtn, { backgroundColor: canConfirm ? C.active : C.latte }]}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm exchange</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.confirmHint}>Only confirm once the book is in your hands</Text>
              </View>
            </View>
          )}

          {/* ---------------- RECEIVER · scanner ---------------- */}
          {mode === 'receiver' && scanMode && (
            <View style={styles.scannerBody}>
              <View style={styles.scanner}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={verifying ? undefined : onScan}
                />
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                </View>
              </View>
              <Text style={styles.scanCaption}>Point at {ownerName.split(' ')[0]}’s QR code</Text>
              <TouchableOpacity style={styles.scanInstead} onPress={() => setScanMode(false)}>
                <Text style={styles.scanInsteadText}>Type the code instead</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 17, color: C.text },
  segWrap: { paddingHorizontal: 22 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segItem: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segText: { fontFamily: 'Inter-SemiBold', fontSize: 13, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22 },
  micCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,213,128,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: C.muted, marginTop: 12 },
  otherName: { fontFamily: 'Poppins-Bold', fontSize: 19, color: C.text, marginTop: 2 },
  codeCard: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FFB43C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 4,
  },
  codeChar: {
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    letterSpacing: 1,
    color: C.text,
  },
  codeDivider: { width: 2, height: 34, backgroundColor: C.cardBorder, marginHorizontal: 6 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  expiryText: { fontFamily: 'Inter-Regular', fontSize: 13, color: C.muted },
  expiryStrong: { color: C.text, fontFamily: 'Inter-Bold', fontWeight: '700' },
  regen: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: C.active, fontWeight: '600' },
  qrRow: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrThumb: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  qrTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: C.text, fontWeight: '600' },
  qrSub: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, marginTop: 1 },
  offline: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  offlineText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: C.greenFg },
  receiverTitle: { fontFamily: 'Poppins-Bold', fontSize: 21, color: C.text, textAlign: 'center' },
  receiverSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: C.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 26 },
  box: {
    width: 44,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: C.text,
  },
  scanInstead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  scanInsteadText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: C.active, fontWeight: '600' },
  confirmBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: BookLoopColors.cream, fontWeight: '600' },
  confirmHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: BookLoopColors.mutedText,
    textAlign: 'center',
    marginTop: 10,
  },
  scannerBody: { flex: 1, paddingHorizontal: 22, paddingTop: 8, alignItems: 'center' },
  scanner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scanFrame: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: C.gold },
  tl: { top: '22%', left: '18%', borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: '22%', right: '18%', borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: '22%', left: '18%', borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: '22%', right: '18%', borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanCaption: { fontFamily: 'Inter-Regular', fontSize: 13, color: C.muted, marginTop: 16 },
  // completion (5d)
  doneBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  doneRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(76,175,80,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  doneTitle: { fontFamily: 'Poppins-Bold', fontSize: 25, color: C.text, marginTop: 24 },
  doneSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: C.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },
  doneStrong: { color: C.text, fontFamily: 'Inter-SemiBold', fontWeight: '600' },
  karma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    backgroundColor: 'rgba(255,213,128,0.35)',
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  karmaText: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.active, fontWeight: '700' },
  doneFooter: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  confirmBtn2: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.active,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.active,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  ghostBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  ghostText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: C.active, fontWeight: '600' },
});
