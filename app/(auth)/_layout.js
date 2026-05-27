import { Stack } from 'expo-router';
import ErrorBoundaryFallback from '../../components/ui/ErrorBoundaryFallback';

export function ErrorBoundary(props) {
    return <ErrorBoundaryFallback {...props} />;
}

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }} />
    );
}
