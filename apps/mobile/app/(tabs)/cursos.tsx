import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card, MutedText, Screen } from '../../components/ui/primitives';
import { env } from '../../lib/env';
import { formatCurrency } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface CourseItem {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
}

export default function CursosScreen() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, description, price_cents, duration_hours, level')
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .eq('is_active', true)
      .order('title');

    if (fetchError) {
      setLoading(false);
      setCourses([]);
      setError(fetchError.message);
      return;
    }

    setCourses(
      (data || []).map((item) => ({
        id: String(item.id),
        title: String(item.title),
        description: String(item.description || ''),
        price_cents: Number(item.price_cents || 0),
        duration_hours: Number(item.duration_hours || 0),
        level: String(item.level || ''),
      })),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCourses();
    }, [loadCourses]),
  );

  return (
    <Screen title="Cursos" subtitle="Capacitación profesional de barbería">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <MutedText>Cargando cursos...</MutedText> : null}
      {!loading && courses.length === 0 ? <MutedText>No hay cursos activos.</MutedText> : null}

      <View style={styles.list}>
        {courses.map((course) => (
          <Pressable
            key={course.id}
            onPress={() =>
              router.push({
                pathname: '/courses/[id]',
                params: { id: course.id },
              })
            }
          >
            <Card>
              <Text style={styles.title}>{course.title}</Text>
              <Text style={styles.description} numberOfLines={3}>
                {course.description}
              </Text>
              <Text style={styles.meta}>
                {course.duration_hours} h - Nivel {course.level}
              </Text>
              <Text style={styles.price}>{formatCurrency(course.price_cents)}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  title: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 16,
  },
  description: {
    color: '#475569',
    fontSize: 13,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  price: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
