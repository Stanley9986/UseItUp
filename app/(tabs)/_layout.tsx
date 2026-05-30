import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { palette } from '@/components/useitup/ui';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const sidePadding = width > 760 ? Math.max((width - 760) / 2, 0) : 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.blue,
        tabBarInactiveTintColor: palette.muted,
        tabBarItemStyle: {
          maxWidth: 190,
        },
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.line,
          height: 74,
          paddingBottom: 10,
          paddingLeft: sidePadding,
          paddingRight: sidePadding,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'basket' : 'basket-outline'} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => (
            <Ionicons
              color="#fff"
              name="add"
              size={28}
              style={{
                backgroundColor: palette.blue,
                borderRadius: 18,
                height: 48,
                padding: 10,
                width: 48,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'restaurant' : 'restaurant-outline'} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} size={23} />
          ),
        }}
      />
    </Tabs>
  );
}
