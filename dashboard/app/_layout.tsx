import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle:    { backgroundColor: '#0D0D0D' },
          headerTintColor: '#FFFFFF',
          contentStyle:   { backgroundColor: '#0D0D0D' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Finance Tracker' }}
        />
      </Stack>
    </>
  );
}
