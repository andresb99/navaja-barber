import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BarChart,
  LineChart,
  type barDataItem,
  type lineDataItem,
} from 'react-native-gifted-charts';
import { useNavajaTheme } from '../../lib/theme';

type AnalyticsChartTone = 'primary' | 'accent' | 'success' | 'warning' | 'focus';

interface AnalyticsChartDatum {
  label: string;
  value: number;
  color?: string;
}

function resolveToneColor(
  colors: ReturnType<typeof useNavajaTheme>['colors'],
  tone: AnalyticsChartTone,
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

function getChartWidth(viewportWidth: number, items: number) {
  return Math.max(viewportWidth - 104, items * 58);
}

export function AnalyticsBarChart({
  data,
  tone = 'accent',
  height = 220,
  maxValue,
}: {
  data: AnalyticsChartDatum[];
  tone?: AnalyticsChartTone;
  height?: number;
  maxValue?: number;
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const { colors } = useNavajaTheme();
  const toneColor = resolveToneColor(colors, tone);
  const xAxisTextStyle = useMemo<TextStyle>(
    () => ({
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
    }),
    [colors.textMuted],
  );
  const yAxisTextStyle = useMemo<TextStyle>(
    () => ({
      color: colors.textMuted,
      fontSize: 11,
    }),
    [colors.textMuted],
  );
  const chartWidth = getChartWidth(viewportWidth, data.length);
  const yAxisLabelWidth = 40;
  const resolvedMaxValue = maxValue || Math.max(1, ...data.map((item) => item.value));
  const chartData = useMemo<barDataItem[]>(
    () =>
      data.map((item) => ({
        label: item.label,
        value: item.value,
        frontColor: item.color || toneColor,
        gradientColor: item.color || toneColor,
        showGradient: true,
        barBorderRadius: 12,
        labelTextStyle: xAxisTextStyle,
      })),
    [data, toneColor, xAxisTextStyle],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chartScrollContent}
    >
      <View style={{ width: chartWidth }}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={height}
          maxValue={resolvedMaxValue}
          noOfSections={4}
          barWidth={22}
          spacing={16}
          initialSpacing={10}
          endSpacing={10}
          yAxisLabelWidth={yAxisLabelWidth}
          yAxisTextStyle={yAxisTextStyle}
          xAxisLabelTextStyle={xAxisTextStyle}
          xAxisLabelsHeight={44}
          xAxisColor={colors.borderMuted}
          yAxisColor={colors.borderMuted}
          rulesColor={colors.borderMuted}
          rulesThickness={1}
          hideRules={false}
          isAnimated
          animationDuration={280}
          roundedTop
          showLine={false}
          backgroundColor="transparent"
        />
      </View>
    </ScrollView>
  );
}

export function AnalyticsAreaChart({
  data,
  tone = 'focus',
  height = 220,
  maxValue,
}: {
  data: AnalyticsChartDatum[];
  tone?: AnalyticsChartTone;
  height?: number;
  maxValue?: number;
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const { colors } = useNavajaTheme();
  const toneColor = resolveToneColor(colors, tone);
  const xAxisTextStyle = useMemo<TextStyle>(
    () => ({
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
    }),
    [colors.textMuted],
  );
  const yAxisTextStyle = useMemo<TextStyle>(
    () => ({
      color: colors.textMuted,
      fontSize: 11,
    }),
    [colors.textMuted],
  );
  const chartWidth = getChartWidth(viewportWidth, data.length);
  const spacing = data.length > 1 ? Math.max(34, Math.floor(chartWidth / data.length)) : 52;
  const resolvedMaxValue = maxValue || Math.max(1, ...data.map((item) => item.value));
  const chartData = useMemo<lineDataItem[]>(
    () =>
      data.map((item) => ({
        label: item.label,
        value: item.value,
        dataPointColor: item.color || toneColor,
        textColor: colors.textMuted,
      })),
    [colors.textMuted, data, toneColor],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chartScrollContent}
    >
      <View style={{ width: chartWidth }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={height}
          maxValue={resolvedMaxValue}
          spacing={spacing}
          initialSpacing={10}
          endSpacing={10}
          noOfSections={4}
          color={toneColor}
          thickness={3}
          curved
          areaChart
          startFillColor={toneColor}
          endFillColor={toneColor}
          startOpacity={0.22}
          endOpacity={0.03}
          dataPointsColor={toneColor}
          dataPointsRadius={4}
          hideDataPoints={data.length > 8}
          yAxisLabelWidth={40}
          yAxisTextStyle={yAxisTextStyle}
          xAxisLabelTextStyle={xAxisTextStyle}
          xAxisLabelsHeight={44}
          xAxisColor={colors.borderMuted}
          yAxisColor={colors.borderMuted}
          rulesColor={colors.borderMuted}
          rulesThickness={1}
          hideRules={false}
          backgroundColor="transparent"
          isAnimated
          animationDuration={320}
          disableScroll
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chartScrollContent: {
    paddingRight: 6,
  },
});
