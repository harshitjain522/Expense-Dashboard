import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { compactAmount } from '@/utils/format';

/**
 * Emphasis chart: the selected month wears the accent hue and the surrounding
 * months recede to gray, so the eye lands on the month being viewed rather than
 * on whichever bar happens to be tallest. Both colours clear 3:1 against the
 * card surface, and identity never rests on colour alone - the x-axis names
 * every month and the selected total is repeated in the stat tile above.
 */
const SELECTED_COLOR = '#4F46E5';
const CONTEXT_COLOR = '#6B6B76';
const AXIS_COLOR = '#E7E7EC';
const AXIS_TEXT_COLOR = '#6B6B76';

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
  const barData = data.map((point) => ({
    value: point.value,
    label: point.label,
    frontColor: point.monthKey === selectedMonth ? SELECTED_COLOR : CONTEXT_COLOR,
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
        rulesColor={AXIS_COLOR}
        xAxisThickness={1}
        xAxisColor={AXIS_COLOR}
        yAxisThickness={0}
        yAxisTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: AXIS_TEXT_COLOR, fontSize: 10 }}
        formatYLabel={(label: string) => compactAmount(Number(label))}
        disableScroll
      />
    </View>
  );
}
