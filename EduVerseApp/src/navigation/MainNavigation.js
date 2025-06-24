// src/navigation/MainNavigation.js - Navigation with Stack and Tab Navigation
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Text } from "react-native";

// Import screens
import DashboardScreen from "../screens/DashboardScreen";
import CreateCourseScreen from "../screens/CreateCourseScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyCoursesScreen from "../screens/MyCoursesScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import SectionDetailScreen from "../screens/SectionDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

// Stack Navigator for MyCourses flow
function MyCoursesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MyCoursesMain" component={MyCoursesScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="SectionDetail" component={SectionDetailScreen} />
    </Stack.Navigator>
  );
}

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
          headerShown: false, // Menghilangkan header untuk Dashboard
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
        name="MyCourses"
        component={MyCoursesStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
          headerTitle: "My Courses",
          tabBarLabel: "My Courses",
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} />,
          headerTitle: "Wallet Connection",
        }}
      />
    </Tab.Navigator>
  );
}
