import { Stack } from 'expo-router';
import { palette } from '../lib/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="courses/[id]" options={{ title: 'Detalle del curso' }} />
      <Stack.Screen name="book/success" options={{ title: 'Reserva confirmada' }} />
      <Stack.Screen name="staff/index" options={{ title: 'Panel staff' }} />
      <Stack.Screen name="admin/index" options={{ title: 'Panel admin' }} />
      <Stack.Screen name="admin/appointments" options={{ title: 'Citas' }} />
      <Stack.Screen name="admin/staff" options={{ title: 'Equipo' }} />
      <Stack.Screen name="admin/services" options={{ title: 'Servicios' }} />
      <Stack.Screen name="admin/courses" options={{ title: 'Cursos' }} />
      <Stack.Screen name="admin/modelos" options={{ title: 'Modelos' }} />
      <Stack.Screen name="admin/session-modelos/[sessionId]" options={{ title: 'Modelos por sesion' }} />
      <Stack.Screen name="admin/applicants" options={{ title: 'Postulantes' }} />
      <Stack.Screen name="admin/metrics" options={{ title: 'Metricas' }} />
      <Stack.Screen name="appointment/[id]" options={{ title: 'Detalle de cita' }} />
    </Stack>
  );
}

