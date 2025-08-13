import { View, useColorScheme } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

export default function Dashboard() {
      const colorScheme = useColorScheme() || 'light';
      const colors = Colors[colorScheme];
    return (
        <View>
            <ThemedText type="title" style={{ color: colors.tint }}>Dashboard</ThemedText>
        </View>
    )
}