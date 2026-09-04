import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useTheme } from '@/context/ThemeContext';
import { compactAmount } from '@/utils/format';

/**
 * Emphasis chart: the selected month wears the accent hue and the surrounding
 * months recede to gray, so the eye lands on the month being viewed rather than
 * on whichever bar happens to be tallest. Both colours clear 3:1 against the
 * card surface, and identity never rests on colour alone - the x-axis names
 * every month and the selected total is repeated in the figure above.
 */

export interface TrendPoint {
  monthKey: string;
  label: string;
  value: number;
}

interface SpendingTrendChartProps {
  data: TrendPoint[];
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
}

export function SpendingTrendChart({ data, selectedMonth, onSelectMonth }: SpendingTrendChartProps) {
  const { colors } = useTheme();
  const barData = data.map((point) => ({
    value: point.value,
    label: point.label,
    frontColor: point.monthKey === selectedMonth ? colors.accent : colors['ink-faint'],
    onPress: () => onSelectMonth(point.monthKey),
  }));

  return (
    <View className="mt-1">
      <BarChart
        data={barData}
        height={120}
        barWidth={24}
        spacing={18}
        initialSpacing={10}
        roundedTop
        barBorderRadius={4}
        noOfSections={3}
        rulesType="solid"
        rulesColor={colors.border}
        xAxisThickness={1}
        xAxisColor={colors.border}
        yAxisThickness={0}
        yAxisTextStyle={{ color: colors['ink-muted'], fontSize: 10, fontFamily: 'IBMPlexMono_500Medium' }}
        xAxisLabelTextStyle={{ color: colors['ink-muted'], fontSize: 10, fontFamily: 'IBMPlexMono_500Medium' }}
        formatYLabel={(label: string) => {
          const value = Number(label);
          return Number.isFinite(value) ? compactAmount(value) : label;
        }}
        disableScroll
      />
    </View>
  );
}
