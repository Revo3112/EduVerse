import { StyleSheet } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withRepeat,
	withSequence,
	cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useEffect } from "react";

export function HelloWave() {
	const rotationAnimation = useSharedValue(0);

	const startWaving = () => {
		// Reset animation value to avoid conflicts
		rotationAnimation.value = 0;
		// Create a single wave motion (left-right-center)
		const waveSequence = withSequence(
			withTiming(25, {duration: 150}),
			withTiming(0, {duration: 150})
		)
		//  Repeat the wave sequences 4 times
		rotationAnimation.value = withRepeat(waveSequence, 4);
	}

	//  Setup waving automatic waving every 20 seconds
	useEffect(() => {
		// Start wacing immediately when component mounts
		startWaving();

		// set up the interval for repeated waving
		const intervalId = setInterval(startWaving, 5000);

		//  Clean up on component unmount
		return () =>{
			clearInterval(intervalId);
			cancelAnimation(rotationAnimation);
		}
	}, []);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotationAnimation.value}deg` }],
	}));

	return (
		<Animated.View style={animatedStyle}>
			<ThemedText style={styles.text}>👋</ThemedText>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	text: {
		fontSize: 28,
		lineHeight: 32,
		marginTop: -6,
	},
});