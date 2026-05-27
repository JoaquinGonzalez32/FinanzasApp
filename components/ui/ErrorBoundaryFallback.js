import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { palette } from '../../src/theme/colors';

export default function ErrorBoundaryFallback({ error, retry }) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.slate50, padding: 24 }}>
            <MaterialIcons name="error-outline" size={48} color={palette.red500} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.slate900, marginTop: 16, textAlign: 'center' }}>
                Algo salió mal
            </Text>
            <Text style={{ fontSize: 14, color: palette.slate500, marginTop: 8, textAlign: 'center' }}>
                {error?.message || 'Error inesperado'}
            </Text>
            <TouchableOpacity
                onPress={retry}
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
                style={{ marginTop: 24, backgroundColor: palette.indigo500, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
                <Text style={{ color: palette.white, fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
            </TouchableOpacity>
        </View>
    );
}
