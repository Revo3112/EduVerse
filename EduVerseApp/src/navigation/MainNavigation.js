// src/navigation/MainNavigation.js - Navigation without @expo/vector-icons
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

// Import screens
import DashboardScreen from "../screens/DashboardScreen";
import MainScreen from "../screens/MainScreen";
import CreateCourseScreen from "../screens/CreateCourseScreen";

const Tab = createBottomTabNavigator();

// Simple tab bar icon component using emojis
const TabIcon = ({ emoji, focused }) => (
  <Text
    style={{
      fontSize: focused ? 24 : 20,
      opacity: focused ? 1 : 0.6,
    }}
  >
    {emoji}
  </Text>
);

export default function MainNavigation() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#f8f9fa",
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#333",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          headerTitle: "EduVerse Dashboard",
        }}
      />
      <Tab.Screen
        name="Create Course"
        component={CreateCourseScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
          headerTitle: "Courses",
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={MainScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} />,
          headerTitle: "Wallet Connection",
        }}
      />
    </Tab.Navigator>
  );
}
