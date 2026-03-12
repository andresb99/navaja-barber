import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, SelectionChip, SurfaceCard } from '../ui/primitives';
import { useNavajaTheme } from '../../lib/theme';
export { AnalyticsAreaChart, AnalyticsBarChart } from './analytics-charts';

type AnalyticsTone = 'primary' | 'accent' | 'success' | 'warning' | 'focus';

function resolveToneColor(
  colors: ReturnType<typeof useNavajaTheme>['colors'],
  tone: AnalyticsTone,
) {
  if (tone === 'accent') {
    return colors.accent;
  }

  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  if (tone === 'focus') {
    return colors.focus;
  }

  return colors.text;
}

export function AnalyticsFilterBar<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useNavajaTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.filterWrap}>
        {options.map((option) => (
          <SelectionChip
            key={option.value}
            label={option.label}
            active={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function AnalyticsMetricCard({
  label,
  value,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: AnalyticsTone;
}) {
  const { colors } = useNavajaTheme();
  const toneColor = resolveToneColor(colors, tone);

  return (
    <SurfaceCard style={styles.metricCard} contentStyle={styles.metricCardContent}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.metricDot, { backgroundColor: toneColor }]} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      {hint ? <Text style={[styles.metricHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </SurfaceCard>
  );
}

export function AnalyticsBarRow({
  label,
  valueLabel,
  widthPercent,
  hint,
  tone = 'accent',
}: {
  label: string;
  valueLabel: string;
  widthPercent: number;
  hint?: string | null;
  tone?: AnalyticsTone;
}) {
  const { colors } = useNavajaTheme();
  const toneColor = resolveToneColor(colors, tone);

  return (
    <View style={styles.barRow}>
      <View style={styles.rowBetween}>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.itemValue, { color: colors.text }]}>{valueLabel}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.borderMuted }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(0, Math.min(100, widthPercent))}%`,
              backgroundColor: toneColor,
            },
          ]}
        />
      </View>
      {hint ? <Text style={[styles.itemHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

export function AnalyticsLineItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useNavajaTheme();

  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.itemLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.itemValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function AnalyticsSectionTitle({ children }: PropsWithChildren) {
  const { colors } = useNavajaTheme();
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>;
}

export function AnalyticsPeakChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return <Chip label={`${label} - ${value}`} tone="warning" />;
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  metricCardContent: {
    gap: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  metricHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  barRow: {
    gap: 6,
  },
  itemLabel: {
    fontSize: 13,
    flex: 1,
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 999,
  },
});
