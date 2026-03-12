import '../global.css';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HeroUINativeProviderRaw } from 'heroui-native/provider-raw';
import { NavajaThemeProvider, useNavajaTheme } from '../lib/theme';

function RootNavigator() {
  const { colors } = useNavajaTheme();

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.nav },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            fontSize: 15,
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth/logout" options={{ headerShown: false }} />
        <Stack.Screen name="courses/[id]" options={{ title: 'Detalle del curso' }} />
        <Stack.Screen
          name="courses/enrollment/success"
          options={{ title: 'Estado de la inscripcion' }}
        />
        <Stack.Screen name="book/success" options={{ title: 'Reserva confirmada' }} />
        <Stack.Screen
          name="software-para-barberias"
          options={{ title: 'Software para barberias' }}
        />
        <Stack.Screen
          name="agenda-para-barberos"
          options={{ title: 'Agenda para barberos' }}
        />
        <Stack.Screen name="suscripcion" options={{ title: 'Planes y precios' }} />
        <Stack.Screen name="staff/index" options={{ title: 'Panel staff' }} />
        <Stack.Screen name="admin/index" options={{ title: 'Panel admin' }} />
        <Stack.Screen name="admin/notifications" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="admin/appointments" options={{ title: 'Citas' }} />
        <Stack.Screen name="admin/staff" options={{ title: 'Equipo' }} />
        <Stack.Screen name="admin/barbershop" options={{ title: 'Barberia' }} />
        <Stack.Screen name="admin/services" options={{ title: 'Servicios' }} />
        <Stack.Screen name="admin/courses" options={{ title: 'Cursos' }} />
        <Stack.Screen name="admin/modelos" options={{ title: 'Modelos' }} />
        <Stack.Screen
          name="admin/session-modelos/[sessionId]"
          options={{ title: 'Modelos por sesion' }}
        />
        <Stack.Screen name="admin/applicants" options={{ title: 'Postulantes' }} />
        <Stack.Screen name="admin/metrics" options={{ title: 'Metricas' }} />
        <Stack.Screen name="admin/performance/[staffId]" options={{ title: 'Performance' }} />
        <Stack.Screen name="app-admin/index" options={{ title: 'App admin' }} />
        <Stack.Screen
          name="app-admin/subscriptions"
          options={{ title: 'Switch de suscripciones' }}
        />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Detalle de cita' }} />
        <Stack.Screen
          name="cuenta/resenas/[appointmentId]"
          options={{ title: 'Calificar cita' }}
        />
        <Stack.Screen name="review/[token]" options={{ title: 'Resena' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavajaThemeProvider>
          <HeroUINativeProviderRaw
            config={{
              textProps: {
                allowFontScaling: false,
                maxFontSizeMultiplier: 1.15,
              },
              devInfo: {
                stylingPrinciples: false,
              },
            }}
          >
            <RootNavigator />
          </HeroUINativeProviderRaw>
        </NavajaThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
