import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppRole, getAuthContext } from '../../lib/auth';
import { Card, Chip, Screen } from '../../components/ui/primitives';
import { envValidation } from '../../lib/env';
import { palette } from '../../lib/theme';

const roleLabel: Record<AppRole, string> = {
  guest: 'Invitado',
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

const rotatingFeatures = ['Reservas', 'Cursos', 'Modelos', 'Empleo'] as const;

export default function InicioScreen() {
  const [role, setRole] = useState<AppRole>('guest');
  const [name, setName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAuthContext().then((ctx) => {
        if (!active) {
          return;
        }
        setRole(ctx.role);
        setName(ctx.staffName || ctx.email || null);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen
      title="Navaja Barber"
      subtitle="App nativa completa: reservas, cursos, modelos, empleo, staff y admin."
    >
      {!envValidation.isValid ? (
        <Card style={styles.envCard}>
          <Text style={styles.envTitle}>Configura apps/mobile/.env</Text>
          <Text style={styles.envText}>
            Faltan variables: {envValidation.invalidKeys.join(', ')}.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>Operación en una sola app</Text>
        <Text style={styles.heroText}>
          Gestiona el negocio completo desde mobile con permisos por rol sobre Supabase.
        </Text>
        <RotatingFeatureTicker />
        <View style={styles.heroFooter}>
          <Chip label={roleLabel[role]} tone={role === 'admin' ? 'success' : 'neutral'} />
          <Text style={styles.heroUser}>{name || 'Sin sesión iniciada'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Flujos públicos</Text>
        <View style={styles.grid}>
          <QuickCard title="Agendar" subtitle="Reserva por servicio y horario real." onPress={() => router.push('/(tabs)/reservas')} />
          <QuickCard title="Cursos" subtitle="Sesiones e inscripciones." onPress={() => router.push('/(tabs)/cursos')} />
          <QuickCard title="Modelos" subtitle="Convocatorias y registro." onPress={() => router.push('/(tabs)/modelos')} />
          <QuickCard title="Empleo" subtitle="Postulación con CV." onPress={() => router.push('/(tabs)/empleo')} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Paneles por rol</Text>
        <View style={styles.grid}>
          <QuickCard title="Mi cuenta" subtitle="Perfil, rol y reservas." onPress={() => router.push('/(tabs)/cuenta')} />
          <QuickCard
            title="Panel staff"
            subtitle="Agenda y estado de citas."
            onPress={() => router.push('/staff/index')}
            disabled={role !== 'staff' && role !== 'admin'}
          />
          <QuickCard
            title="Panel admin"
            subtitle="Citas, equipo, cursos, métricas."
            onPress={() => router.push('/admin/index')}
            disabled={role !== 'admin'}
          />
        </View>
      </Card>
    </Screen>
  );
}

function RotatingFeatureTicker() {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intervalId = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }).start(() => {
        setIndex((current) => (current + 1) % rotatingFeatures.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }).start();
      });
    }, 1900);

    return () => {
      clearInterval(intervalId);
    };
  }, [opacity]);

  return (
    <View style={styles.bitsChip}>
      <Text style={styles.bitsLabel}>Demo estilo React Bits</Text>
      <Animated.Text style={[styles.bitsWord, { opacity }]}>
        {rotatingFeatures[index]}
      </Animated.Text>
    </View>
  );
}

function QuickCard({
  title,
  subtitle,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.quick, disabled ? styles.quickDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  envCard: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  envTitle: {
    color: '#92400e',
    fontSize: 15,
    fontWeight: '800',
  },
  envText: {
    color: '#78350f',
    fontSize: 13,
  },
  hero: {
    backgroundColor: '#0f1b2d',
    borderColor: '#1f2e45',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  heroText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  bitsChip: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bitsLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bitsWord: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 72,
  },
  heroFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroUser: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  grid: {
    gap: 8,
  },
  quick: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 3,
  },
  quickDisabled: {
    opacity: 0.45,
  },
  quickTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  quickText: {
    color: '#475569',
    fontSize: 13,
  },
});
