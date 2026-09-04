import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { readValue, writeValue } from '@/utils/storage';

interface LockContextValue {
  /** Whether the device can do this at all: sensor present and enrolled. */
  available: boolean;
  enabled: boolean;
  /** Resolves false when the confirming prompt was cancelled or failed. */
  setEnabled: (next: boolean) => Promise<boolean>;
}

const LockContext = createContext<LockContextValue | undefined>(undefined);

async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // The device passcode stays available on purpose: a sensor that stops
    // recognising someone must not lock them out of their own records.
    disableDeviceFallback: false,
  });
  return result.success;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-5xl mb-4">🔒</Text>
      <Text className="text-ink text-xl font-display">Locked</Text>
      <Text className="text-ink-muted text-sm font-body text-center mt-1.5 mb-6">
        Unlock to view your expenses
      </Text>
      <Pressable
        onPress={onUnlock}
        accessibilityRole="button"
        className="px-6 py-3 rounded-xl bg-accent"
      >
        <Text className="text-on-accent font-strong">Unlock</Text>
      </Pressable>
    </View>
  );
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const prompting = useRef(false);

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        readValue('biometricLock'),
      ]);
      const usable = hasHardware && isEnrolled;
      setAvailable(usable);
      // Enrolment can be removed after the setting was saved. Treating that as
      // "off" avoids leaving the app locked with no way to authenticate.
      const on = usable && stored === 'true';
      setEnabledState(on);
      setLocked(on);
      setReady(true);
    })();
  }, []);

  // Re-lock as soon as the app leaves the foreground.
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      // Only a real backgrounding: iOS reports 'inactive' while the biometric
      // prompt is up, which would re-lock the app the instant it was unlocked.
      if (state === 'background') setLocked(true);
    });
    return () => subscription.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await authenticate('Unlock Expense Dashboard')) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  // Prompt as soon as the lock screen appears. A cancelled prompt leaves the
  // Unlock button to retry rather than re-prompting in a loop.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  const setEnabled = useCallback(async (next: boolean) => {
    if (next && !(await authenticate('Confirm to turn on the biometric lock'))) return false;
    setEnabledState(next);
    await writeValue('biometricLock', next ? 'true' : 'false');
    return true;
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({ available, enabled, setEnabled }),
    [available, enabled, setEnabled]
  );

  return (
    <LockContext.Provider value={value}>
      {/* Nothing of the app renders until the stored setting has been read,
          so enabling the lock cannot be defeated by the first frame. */}
      {!ready ? (
        <View className="flex-1 bg-background" />
      ) : locked ? (
        <LockScreen onUnlock={unlock} />
      ) : (
        children
      )}
    </LockContext.Provider>
  );
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within a LockProvider');
  return ctx;
}
