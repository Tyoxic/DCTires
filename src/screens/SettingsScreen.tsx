import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
  Share, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { RootStackParamList } from '../models/types';
import { exportData, pickAndImportData } from '../utils/backup';
import { sendBugReport } from '../utils/bugReport';
import { checkApkVersion, ApkStatus, RELEASES_PAGE_URL } from '../utils/apkVersion';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [apkStatus, setApkStatus] = useState<ApkStatus | null>(null);
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [sending, setSending] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const runApkCheck = useCallback(async () => {
    setChecking(true);
    try {
      const status = await checkApkVersion();
      setApkStatus(status);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (__DEV__) return;
    if (Platform.OS !== 'android') return;
    runApkCheck();
  }, [runApkCheck]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportData();
    } catch {
      Alert.alert('Error', 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setShowImportConfirm(false);
    setImporting(true);
    try {
      const summary = await pickAndImportData();
      if (summary) {
        Alert.alert(
          'Import complete',
          `Imported ${summary.customers} customer(s), ${summary.inventoryItems} inventory item(s), ${summary.services} service(s).`,
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to import data.');
    } finally {
      setImporting(false);
    }
  }, [navigation]);

  const handleCheckForUpdates = useCallback(async () => {
    if (__DEV__) {
      Alert.alert('Dev mode', 'Updates only run in production builds.');
      return;
    }
    setChecking(true);
    try {
      const ota = await Updates.checkForUpdateAsync().catch(() => ({ isAvailable: false }));
      if (ota.isAvailable) {
        Alert.alert(
          'Update available',
          'A new JS update is ready. Install now? The app will restart.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Install',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch {
                  Alert.alert('Error', 'Failed to install update.');
                }
              },
            },
          ]
        );
        return;
      }
      const apk = await checkApkVersion();
      setApkStatus(apk);
      if (apk.status === 'update-available' && apk.latestVersion) {
        Alert.alert(
          'New APK available',
          `v${apk.latestVersion} is available. You're on v${apk.currentVersion}.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open releases', onPress: () => openReleases() },
          ]
        );
        return;
      }
      Alert.alert('Up to date', 'You are running the latest version.');
    } catch {
      Alert.alert('Error', 'Failed to check for updates.');
    } finally {
      setChecking(false);
    }
  }, []);

  const openReleases = useCallback(async () => {
    setOpeningBrowser(true);
    try {
      await WebBrowser.openBrowserAsync(RELEASES_PAGE_URL);
    } catch {
      Alert.alert('Error', `Visit ${RELEASES_PAGE_URL} to download the latest APK.`);
    } finally {
      setOpeningBrowser(false);
    }
  }, []);

  const handleShareLink = useCallback(async () => {
    try {
      await Share.share({
        message: `DCTires — tire-changing service tracker. Android install: ${RELEASES_PAGE_URL}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to open share sheet.');
    }
  }, []);

  const handleBugReport = useCallback(async () => {
    setSending(true);
    try {
      await sendBugReport();
    } catch {
      Alert.alert('Error', 'Failed to open email composer.');
    } finally {
      setSending(false);
    }
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const updateTag = Updates.updateId ? `ota:${Updates.updateId.slice(0, 8)}` : 'embedded';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
      <Text style={styles.section}>Data</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.primary, exporting && styles.disabled]} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Export backup (JSON)</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outline, importing && styles.disabled]} onPress={() => setShowImportConfirm(true)} disabled={importing}>
          {importing ? <ActivityIndicator color="#2196F3" /> : <Text style={styles.outlineText}>Import backup</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>App updates</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.primary, checking && styles.disabled]} onPress={handleCheckForUpdates} disabled={checking}>
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Check for updates</Text>}
        </TouchableOpacity>
        {apkStatus ? (
          <TouchableOpacity style={styles.statusRow} onPress={runApkCheck}>
            {apkStatus.status === 'update-available' ? (
              <Text style={styles.statusUpdate}>
                ⚠ New version v{apkStatus.latestVersion} available (you're on v{apkStatus.currentVersion}) — tap to recheck
              </Text>
            ) : apkStatus.status === 'up-to-date' ? (
              <Text style={styles.statusOk}>✓ Up to date (v{apkStatus.currentVersion}) — tap to recheck</Text>
            ) : (
              <Text style={styles.statusErr}>Couldn't check — tap to retry</Text>
            )}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.outline, openingBrowser && styles.disabled]} onPress={openReleases} disabled={openingBrowser}>
          {openingBrowser ? <ActivityIndicator color="#2196F3" /> : <Text style={styles.outlineText}>Open releases page</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.outline} onPress={handleShareLink}>
          <Text style={styles.outlineText}>Share install link</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Help</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.primary, sending && styles.disabled]} onPress={handleBugReport} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send bug report</Text>}
        </TouchableOpacity>
        <Text style={styles.helper}>
          Opens email composer with device info, app version, and recent log entries pre-filled.
        </Text>
      </View>

      <Text style={styles.version}>DCTires v{appVersion} ({updateTag})</Text>

      <ConfirmModal
        visible={showImportConfirm}
        title="Import backup"
        message="This will REPLACE all existing data with the backup file's contents. This cannot be undone."
        confirmLabel="Import"
        onConfirm={handleImport}
        onCancel={() => setShowImportConfirm(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  section: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  primary: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outline: { borderWidth: 1.5, borderColor: '#2196F3', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  outlineText: { color: '#2196F3', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  helper: { fontSize: 11, color: '#888', marginTop: 10, lineHeight: 16 },
  statusRow: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#fafafa', marginTop: 10, alignItems: 'center' },
  statusOk: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  statusUpdate: { fontSize: 12, color: '#E65100', fontWeight: '700', textAlign: 'center' },
  statusErr: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  version: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 16 },
});
