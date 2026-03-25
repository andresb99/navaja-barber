import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="inicio" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="reservas" options={{ title: 'Reservas' }} />
      <Tabs.Screen name="cursos" options={{ title: 'Cursos' }} />
      <Tabs.Screen name="modelos" options={{ title: 'Modelos' }} />
      <Tabs.Screen name="empleo" options={{ title: 'Empleo' }} />
      <Tabs.Screen name="cuenta" options={{ title: 'Cuenta' }} />
    </Tabs>
  );
}
