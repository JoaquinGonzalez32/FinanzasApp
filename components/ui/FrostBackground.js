import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const FrostBackground = ({ children, edges = ['top'], style }) => {
    const isDark = useColorScheme() === 'dark';

    if (isDark) {
        return (
            <SafeAreaView className="flex-1 bg-background-dark" edges={edges} style={style}>
                {children}
            </SafeAreaView>
        );
    }

    return (
        <LinearGradient
            colors={['#e8edf6', '#eee8f4', '#f2edf8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[{ flex: 1 }, style]}
        >
            <SafeAreaView className="flex-1" edges={edges}>
                {children}
            </SafeAreaView>
        </LinearGradient>
    );
};

export default FrostBackground;
