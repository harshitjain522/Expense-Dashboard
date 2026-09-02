import { withLayoutContext } from 'expo-router';
import { Text } from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';

const { Navigator } = createMaterialTopTabNavigator();

const Tabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#A0A0AC',
        tabBarIndicatorStyle: { height: 0 },
        tabBarShowIcon: true,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E7E7EC',
          backgroundColor: '#FFFFFF',
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', textTransform: 'none', margin: 0 },
        tabBarItemStyle: { flexDirection: 'column' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon="🧾" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
