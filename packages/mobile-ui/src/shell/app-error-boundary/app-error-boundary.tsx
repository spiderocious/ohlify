import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton } from '../../primitives/app-button/app-button';
import { AppText } from '../../primitives/app-text/app-text';
import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';

export interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Called (in addition to the built-in reset) when the user taps Try again — e.g. to force-remount a stale query. */
  onReset?: () => void;
  /** Reported alongside the caught error, e.g. to a crash-reporting service. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level error boundary. Class component because React only supports
 * catching render errors via componentDidCatch/getDerivedStateFromError —
 * there's no hook equivalent. In development, shows the actual error and
 * stack so the failure is immediately diagnosable; in production, shows a
 * generic on-brand message so a crash never surfaces raw internals to a
 * real user. There is no Flutter equivalent to mirror here — Flutter's
 * ui/widgets/feature_error_boundary/feature_error_boundary.dart exists but
 * is dead code (never wired to ErrorWidget.builder, never actually
 * populates its error state) — this is a new, RN-only addition.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorScreen error={error} onReset={this.handleReset} />;
  }
}

function ErrorScreen({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: `${colors.error}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="error" size={36} color={colors.error} />
        </View>
        <View style={{ height: 24 }} />
        <AppText variant="title" color={colors.textJet} align="center" weight="800">
          Something went wrong
        </AppText>
        <View style={{ height: 8 }} />
        <AppText variant="body" color={colors.textMuted} align="center">
          {__DEV__
            ? "Here's what broke — this detail is hidden in production builds."
            : 'We hit a snag loading this. Give it another try — if it keeps happening, reach out to support.'}
        </AppText>
        {__DEV__ ? (
          <>
            <View style={{ height: 20 }} />
            <View
              style={{
                width: '100%',
                maxHeight: 260,
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
              }}
            >
              <ScrollView>
                <AppText variant="bodyNormal" color={colors.error} align="left" weight="600">
                  {error.name}: {error.message}
                </AppText>
                {error.stack ? (
                  <>
                    <View style={{ height: 8 }} />
                    <AppText variant="bodySmallest" color={colors.textSlate} align="left">
                      {error.stack}
                    </AppText>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </>
        ) : null}
        <View style={{ height: 28 }} />
        <AppButton
          label="Try again"
          radius={100}
          startIcon={<AppIcon name="refresh" size={18} color={colors.textWhite} />}
          onPress={onReset}
        />
      </ScrollView>
    </View>
  );
}
