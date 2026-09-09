import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { getCategory } from '@/constants/categories';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import { hasSmsPermission, isSupported, readInbox, requestSmsPermission } from '@/modules/sms-inbox';
import { formatDateShort } from '@/utils/format';
import { parseInbox, type ParsedSms } from '@/utils/smsParser';

/** How far back a scan looks. Older alerts are usually already in the ledger. */
const SCAN_DAYS = 90;
const MAX_MESSAGES = 500;

type Status = 'checking' | 'needs-permission' | 'scanning' | 'ready' | 'unsupported';

/**
 * Reads bank and UPI alerts out of the SMS inbox and offers them as
 * transactions. Nothing is written until "Add" is pressed: the parser is a
 * heuristic (utils/smsParser.ts) and this screen is where a person checks its
 * work before it reaches the ledger.
 */
export default function ImportSmsScreen() {
  const { addTransactions, importedSmsIds, formatAmount } = useFinance();
  const { colors } = useTheme();

  const [status, setStatus] = useState<Status>(isSupported ? 'checking' : 'unsupported');
  const [candidates, setCandidates] = useState<ParsedSms[]>([]);
  // How many messages the scan actually read. Shown alongside the hit count so
  // "nothing found" separates into "could not read the inbox" and "read it,
  // none of it looked like a bank alert".
  const [scanned, setScanned] = useState(0);
  const [skipped, setSkipped] = useState(new Set<string>());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const scan = useCallback(async () => {
    setStatus('scanning');
    try {
      const since = Date.now() - SCAN_DAYS * 24 * 60 * 60 * 1000;
      const messages = await readInbox(since, MAX_MESSAGES);
      setScanned(messages.length);
      setCandidates(parseInbox(messages, importedSmsIds));
      setSkipped(new Set());
      setStatus('ready');
    } catch (error) {
      setStatus('needs-permission');
      Alert.alert('Could not read messages', String(error));
    }
  }, [importedSmsIds]);

  // Once per mount: adding transactions changes `importedSmsIds`, which
  // rebuilds `scan`, and without this the screen would re-scan itself on the
  // way out.
  const autoScanned = useRef(false);
  useEffect(() => {
    if (!isSupported || autoScanned.current) return;
    autoScanned.current = true;
    // Only auto-scan when access is already granted. Opening a system
    // permission dialog the moment a screen mounts is how people learn to
    // reflex-deny it.
    void hasSmsPermission().then((granted) => {
      if (granted) void scan();
      else setStatus('needs-permission');
    });
  }, [scan]);

  async function grantAndScan() {
    if (await requestSmsPermission()) await scan();
    else setStatus('needs-permission');
  }

  function toggle(smsId: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(smsId)) next.delete(smsId);
      else next.add(smsId);
      return next;
    });
  }

  function setCategory(smsId: string, categoryId: string) {
    setCandidates((prev) => prev.map((c) => (c.smsId === smsId ? { ...c, categoryId } : c)));
  }

  const selected = candidates.filter((c) => !skipped.has(c.smsId));

  async function addSelected() {
    if (!selected.length) return;
    setSaving(true);
    await addTransactions(
      selected.map((c) => ({
        type: c.type,
        amount: String(c.amount),
        categoryId: c.categoryId,
        date: c.date,
        note: c.note,
        paymentMethod: c.paymentMethod,
        smsId: c.smsId,
      }))
    );
    setSaving(false);
    router.back();
  }

  if (status === 'unsupported') {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon="📵"
          title="Android only"
          subtitle="Reading the message inbox is not something iOS lets any app do."
        />
      </View>
    );
  }

  if (status === 'checking' || status === 'scanning') {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.accent} />
        <Text className="text-ink-muted text-sm font-body mt-3">
          {status === 'scanning' ? 'Reading your messages…' : ''}
        </Text>
      </View>
    );
  }

  if (status === 'needs-permission') {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20 }}>
        <View className="bg-surface rounded-xl p-5">
          <Text className="text-ink text-base font-display mb-2">Read bank alerts</Text>
          <Text className="text-ink-muted text-sm font-body leading-5">
            Spent can look through the last {SCAN_DAYS} days of your SMS inbox for bank, card and
            UPI alerts and turn them into transactions. Messages are read on this device, stay on
            it, and you see every entry before it is added.
          </Text>
          <Pressable
            onPress={() => void grantAndScan()}
            accessibilityRole="button"
            className="mt-4 items-center py-3 rounded-xl bg-accent"
          >
            <Text className="text-on-accent font-strong">Allow message access</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        {candidates.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Nothing new to import"
            subtitle={`Read ${scanned} message${scanned === 1 ? '' : 's'} from the last ${SCAN_DAYS} days; none of them looked like a bank alert that is not already here.`}
          />
        ) : (
          <>
            <Text className="text-ink-muted text-[13px] font-ui mb-3">
              {candidates.length} of {scanned} messages · tap a row to leave it out
            </Text>
            {candidates.map((candidate) => {
              const category = getCategory(candidate.categoryId);
              const include = !skipped.has(candidate.smsId);
              const isOpen = expanded === candidate.smsId;
              return (
                <View
                  key={candidate.smsId}
                  className="bg-surface rounded-xl mb-2 overflow-hidden"
                  style={{ opacity: include ? 1 : 0.45 }}
                >
                  <Pressable
                    onPress={() => toggle(candidate.smsId)}
                    onLongPress={() => setExpanded(isOpen ? null : candidate.smsId)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: include }}
                    accessibilityLabel={`${candidate.note}, ${formatAmount(candidate.amount)}`}
                    className="flex-row items-center px-4 py-3.5"
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${category.color}22` }}
                    >
                      <Text className="text-sm">{category.icon}</Text>
                    </View>
                    <View className="flex-1 pr-3">
                      <Text className="text-ink text-[15px] font-ui" numberOfLines={1}>
                        {candidate.note}
                      </Text>
                      <Text className="text-ink-muted text-xs font-body mt-0.5" numberOfLines={1}>
                        {category.label} · {candidate.paymentMethod} ·{' '}
                        {formatDateShort(candidate.date)}
                      </Text>
                    </View>
                    <Text
                      className={`text-[15px] font-num-strong ${
                        candidate.type === 'income' ? 'text-success' : 'text-ink'
                      }`}
                    >
                      {candidate.type === 'income' ? '+' : ''}
                      {formatAmount(candidate.amount)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setExpanded(isOpen ? null : candidate.smsId)}
                    accessibilityRole="button"
                    accessibilityLabel={isOpen ? 'Hide the original message' : 'Show the original message'}
                    className="px-4 pb-3"
                  >
                    <Text className="text-ink-faint text-[11px] font-body" numberOfLines={isOpen ? 0 : 1}>
                      {candidate.sender}: {candidate.body}
                    </Text>
                  </Pressable>

                  {isOpen && (
                    <View className="px-4 pb-4">
                      <CategoryPicker
                        value={candidate.categoryId}
                        onChange={(id) => setCategory(candidate.smsId, id)}
                        type={candidate.type}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {candidates.length > 0 && (
        <View className="px-5 pb-6 pt-3 bg-background border-t border-border">
          <Pressable
            onPress={() => void addSelected()}
            disabled={!selected.length || saving}
            accessibilityRole="button"
            className="items-center py-3.5 rounded-xl bg-accent"
            style={{ opacity: selected.length && !saving ? 1 : 0.4 }}
          >
            <Text className="text-on-accent font-strong">
              {saving
                ? 'Adding…'
                : `Add ${selected.length} transaction${selected.length === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
