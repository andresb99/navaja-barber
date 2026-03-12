import { useEffect } from 'react';
import { router } from 'expo-router';
import { MutedText, Screen } from '../../components/ui/primitives';
import { supabase } from '../../lib/supabase';

export default function AuthLogoutScreen() {
  useEffect(() => {
    let active = true;

    void supabase.auth.signOut({ scope: 'local' }).finally(() => {
      if (active) {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen title="Cerrar sesion" subtitle="Limpiando tu acceso local">
      <MutedText>Cerrando sesion...</MutedText>
    </Screen>
  );
}
