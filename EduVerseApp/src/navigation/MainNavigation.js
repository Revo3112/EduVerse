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
import HelpSupportScreen from "../screens/HelpSupportScreen";
import AboutScreen from "../screens/AboutScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TermsPrivacyScreen from "../screens/TermsPrivacyScreen";
import IPFSTestScreen from "../screens/IPFSTestScreen";

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

// Stack Navigator for Profile flow
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f8f9fa",
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#333",
        },
        headerBackTitleVisible: false,
        headerTintColor: "#007AFF",
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TermsPrivacy"
        component={TermsPrivacyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IPFSTest"
        component={IPFSTestScreen}
        options={{
          headerShown: false,
        }}
      />
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="MyCourses"
        component={MyCoursesStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎓" focused={focused} />,
          headerShown: false,
          tabBarLabel: "My Courses",
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
