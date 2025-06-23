// src/components/DashboardCard.js - Fixed Icon Implementation
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// Instead of using @expo/vector-icons, use simple text icons or create custom icon component
const Icon = ({ name, size = 24, color = "#333" }) => {
  const iconMap = {
    // Course related icons
    book: "📚",
    "book-open": "📖",
    plus: "➕",
    "plus-circle": "⊕",
    // Certificate related icons
    award: "🏆",
    certificate: "🎓",
    medal: "🏅",
    // Navigation icons
    home: "🏠",
    user: "👤",
    settings: "⚙️",
    // Action icons
    edit: "✏️",
    delete: "🗑️",
    check: "✅",
    close: "❌",
    // Other icons
    star: "⭐",
    heart: "❤️",
    like: "👍",
    dislike: "👎",
  };

  return <Text style={{ fontSize: size, color }}>{iconMap[name] || "📄"}</Text>;
};

export default function DashboardCard({
  title,
  subtitle,
  iconName = "book",
  onPress,
  backgroundColor = "#f8f9fa",
  iconColor = "#007AFF",
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Icon name={iconName} size={32} color={iconColor} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.chevron}>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  chevron: {
    justifyContent: "center",
    alignItems: "center",
  },
  chevronText: {
    fontSize: 20,
    color: "#ccc",
    fontWeight: "300",
  },
});
