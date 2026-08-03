import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Appearance } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { captureError } from '../lib/sentry';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[KILIMO AI] Unhandled error caught by boundary:', error, info);
    // Report to Sentry (no-op unless a DSN is configured).
    captureError(error, { componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDark = Appearance.getColorScheme() === 'dark';
      const dynamicStyles = {
        container: { backgroundColor: isDark ? '#020617' : '#F2F7F2' },
        title: { color: isDark ? '#f8fafc' : '#0F1F0F' },
        subtitle: { color: isDark ? '#94a3b8' : '#4A6B4A' },
        errorMsg: {
          color: '#ef4444',
          backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
        },
        btnText: { color: isDark ? '#020617' : '#0F1F0F' },
      };
      return (
        <SafeAreaView style={[s.container, dynamicStyles.container]}>
          <View style={s.inner}>
            <View style={s.iconWrap}>
              <AlertTriangle size={48} color="#ef4444" />
            </View>
            <Text style={[s.title, dynamicStyles.title]}>Hitilafu Imetokea</Text>
            <Text style={[s.subtitle, dynamicStyles.subtitle]}>Something went wrong</Text>
            {__DEV__ && this.state.error ? (
              <Text style={[s.errorMsg, dynamicStyles.errorMsg]} numberOfLines={4}>
                {this.state.error.message}
              </Text>
            ) : null}
            <TouchableOpacity style={s.btn} onPress={this.handleReset} activeOpacity={0.8}>
              <Text style={[s.btnText, dynamicStyles.btnText]}>Jaribu Tena / Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontFamily: 'Inter_900Black', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, marginBottom: 16, textAlign: 'center', fontFamily: 'Inter_500Medium' },
  errorMsg: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    width: '100%',
  },
  btn: { backgroundColor: '#2E6F40', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold' },
});
