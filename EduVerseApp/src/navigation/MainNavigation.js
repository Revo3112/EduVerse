// src/navigation/MainNavigation.js - UPGRADED: Expo optimized with Ionicons
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

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

// ✅ Stack Navigator for MyCourses flow
function MyCoursesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#f8f9fa" },
      }}
    >
      <Stack.Screen name="MyCoursesMain" component={MyCoursesScreen} />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{
          headerShown: false,
          title: "Course Details",
        }}
      />
      <Stack.Screen
        name="SectionDetail"
        component={SectionDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// ✅ Stack Navigator for Profile flow
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#333",
        },
        headerBackTitleVisible: false,
        headerTintColor: "#007AFF",
        cardStyle: { backgroundColor: "#f8f9fa" },
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
          title: "Help & Support",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: "About EduVerse",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="TermsPrivacy"
        component={TermsPrivacyScreen}
        options={{
          title: "Terms & Privacy",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="IPFSTest"
        component={IPFSTestScreen}
        options={{
          title: "IPFS Test",
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

// ✅ Main Tab Navigator - Expo optimized
export default function MainNavigation() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // ✅ Dynamic tab bar icons using Ionicons
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Create Course":
              iconName = focused ? "add-circle" : "add-circle-outline";
              break;
            case "MyCourses":
              iconName = focused ? "school" : "school-outline";
              break;
            case "Wallet":
              iconName = focused ? "wallet" : "wallet-outline";
              break;
            default:
              iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // ✅ Enhanced tab bar styling
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e9ecef",
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 10,
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        // ✅ Header styling for consistency
        headerStyle: {
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#333",
          fontSize: 18,
        },
        headerTintColor: "#007AFF",
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="Create Course"
        component={CreateCourseScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Create",
        }}
      />
      <Tab.Screen
        name="MyCourses"
        component={MyCoursesStack}
        options={{
          headerShown: false,
          tabBarLabel: "My Courses",
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={ProfileStack}
        options={{
          headerShown: false,
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}
