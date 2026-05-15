import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { getDatabase } from './src/db/database';
import { loadSeedIfNeeded } from './src/db/seed/loadSeed';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initErrorLog, addBreadcrumb } from './src/utils/errorLog';

initErrorLog();

function getActiveRouteName(state: any): string | undefined {
  if (!state || typeof state.index !== 'number') return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const lastRouteRef = useRef<string | undefined>(undefined);
  const updatePromptShownRef = useRef(false);
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await loadSeedIfNeeded();
        addBreadcrumb('app', 'Database + seed ready');
      } catch (e) {
        console.error('Database init failed', e);
      }
      setDbReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isUpdatePending || updatePromptShownRef.current || __DEV__) return;
    updatePromptShownRef.current = true;
    addBreadcrumb('updates', 'Update downloaded, prompting to apply');
    Alert.alert(
      'Update Ready',
      'A new version of DCTires has been downloaded. Restart now to apply it?',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            try {
              await Updates.reloadAsync();
            } catch {
              Alert.alert('Error', 'Failed to restart. Please close and reopen the app.');
            }
          },
        },
      ]
    );
  }, [isUpdatePending]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer
          onStateChange={(state) => {
            const current = getActiveRouteName(state);
            if (current && current !== lastRouteRef.current) {
              addBreadcrumb('navigation', `Navigated to ${current}`);
              lastRouteRef.current = current;
            }
          }}
        >
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
