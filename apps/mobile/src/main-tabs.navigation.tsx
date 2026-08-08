import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppBadge, AppHeader, AppSvg, colors } from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Animated, Pressable, View } from 'react-native';

import type { RootStackParamList } from './app.navigation';
import { CallsScreen } from '@features/calls/screen/calls-screen';
import { ChatsScreen } from '@features/chat/screen/chats-screen';
import { HomeScreen } from '@features/home/screen/home-screen';
import { ProfileStackNavigator } from '@features/profile/profile-stack.navigation';
import { WalletScreen } from '@features/wallet/screen/wallet-screen';
import { KycReviewBanner } from '@shared/parts/kyc-review-banner';
import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { badgesQueryKey, markSurfaceSeen, useBadges, type Badges } from '@shared/api/use-badges';

/**
 * Main tab shell. Mirrors mobile/lib/app_router.dart's
 * StatefulShellRoute.indexedStack — 5 branches (home/calls/chats/wallet/
 * profile), matching mobile/lib/ui/widgets/app_bottom_nav_bar/
 * app_bottom_nav_bar.dart's `appMainNavItems` (5 entries) rather than
 * AppShell._tabRoots (which only lists 4 — that list is missing "chats"
 * and looks like a latent bug in the Dart source: the router registers a
 * Chats branch, and the nav bar renders 5 items, but that array only
 * highlights 4 of them as active. We build the intended 5-tab bar the
 * router/nav-items actually specify, not the buggy 4-item active-highlight
 * list — see docs/mobile-work/todo.md for this call).
 */
export type MainTabParamList = {
  HomeTab: undefined;
  CallsTab: undefined;
  ChatsTab: undefined;
  /** openFund: true auto-opens the Fund wallet modal on arrival — used by the insufficient-balance redirect from Buy minutes. */
  WalletTab: { openFund?: boolean } | undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_SVGS: Record<keyof MainTabParamList, 'navHome' | 'navCalls' | 'navChats' | 'navWallet' | 'navProfile'> = {
  HomeTab: 'navHome',
  CallsTab: 'navCalls',
  ChatsTab: 'navChats',
  WalletTab: 'navWallet',
  ProfileTab: 'navProfile',
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'Home',
  CallsTab: 'Calls',
  ChatsTab: 'Chats',
  WalletTab: 'Wallet',
  ProfileTab: 'Profile',
};

const TAB_WIDTH = 64;
const TAB_HEIGHT = 48;
/** Bar height excluding the bottom safe-area inset, which is added at render. */
const TAB_BAR_HEIGHT = 68;
// Large enough that the circle's radius covers every corner of the pill
// once fully grown, from a bottom-center origin.
const RIPPLE_MAX_DIAMETER = Math.hypot(TAB_WIDTH, TAB_HEIGHT) * 2.2;

/**
 * WhatsApp-style tab: label always visible below the icon. On focus, only
 * the pill background animates — a circle grows from the bottom-center of
 * the tab, clipped to the rounded-rect bounds, like a ripple/ink reveal
 * shooting up to fill the available space. The icon and label sit on top,
 * unscaled, and just swap color as the fill reaches them.
 */
/**
 * Per-tab unread rule.
 *
 * Numbers where the count is actionable and the data supports it — Chats has
 * per-conversation read state. Dots where "something happened since you last
 * looked" is the whole signal; a number on Wallet would imply an unread-
 * transaction concept the product does not have. Home never badges.
 */
function badgeFor(route: keyof MainTabParamList, badges: Badges): ReactNode {
  switch (route) {
    case 'ChatsTab':
      return <AppBadge count={badges.chatsUnread} />;
    case 'CallsTab':
      return badges.callsUnseen ? <AppBadge /> : null;
    case 'WalletTab':
      return badges.walletUnseen ? <AppBadge /> : null;
    default:
      return null;
  }
}

function TabIcon({
  route,
  focused,
  badge,
}: {
  route: keyof MainTabParamList;
  focused: boolean;
  badge: ReactNode;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      speed: 14,
      bounciness: 6,
    }).start();
  }, [focused, progress]);

  const rippleScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const textColor = progress.interpolate({ inputRange: [0, 1], outputRange: [colors.textSlate, colors.textWhite] });

  return (
    <View
      style={{
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -RIPPLE_MAX_DIAMETER / 2,
          left: (TAB_WIDTH - RIPPLE_MAX_DIAMETER) / 2,
          width: RIPPLE_MAX_DIAMETER,
          height: RIPPLE_MAX_DIAMETER,
          borderRadius: RIPPLE_MAX_DIAMETER / 2,
          backgroundColor: colors.primary,
          transform: [{ scale: rippleScale }],
        }}
      />
      <AppSvg name={TAB_SVGS[route]} size={22} color={focused ? colors.textWhite : colors.textSlate} />
      {badge ? <View style={{ position: 'absolute', top: 2, right: 12 }}>{badge}</View> : null}
      <Animated.Text
        style={{
          fontFamily: 'MonaSans-SemiBold',
          fontSize: 11,
          fontWeight: '600',
          color: textColor,
          marginTop: 4,
        }}
      >
        {TAB_LABELS[route]}
      </Animated.Text>
    </View>
  );
}

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Home tab only: AppHeader (logo, copy-link, notification bell) + the sticky KYC review banner. Mirrors AppShell.showHeader in mobile/lib/ui/widgets/app_shell/app_shell.dart. */
function HomeTabHeader() {
  const navigation = useNavigation<RootNavigation>();
  const { isAuthenticated } = useAuthSession();
  const badges = useBadges(isAuthenticated);
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <AppHeader
        notificationCount={badges.notificationsUnread}
        onCopyLink={() => undefined}
        onNotification={() => navigation.navigate('Notifications')}
      />
      <KycReviewBanner />
    </View>
  );
}

/** Every other tab: no AppHeader, just the sticky KYC review banner (with its own top safe-area padding since there's no app bar). */
function TabKycBannerHeader() {
  return (
    <View style={{ backgroundColor: colors.background }}>
      <KycReviewBanner />
    </View>
  );
}

/**
 * Wraps a tab's content so switching tabs slides+fades the incoming screen
 * in from the side instead of the instant IndexedStack snap that React
 * Navigation's bottom-tabs uses by default.
 */
function withTabTransition<P extends object>(Screen: ComponentType<P>) {
  return function AnimatedTabScreen(props: P) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(12)).current;

    useFocusEffect(
      useCallback(() => {
        opacity.setValue(0);
        translateX.setValue(12);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
        ]).start();
      }, [opacity, translateX]),
    );

    return (
      <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
        <Screen {...props} />
      </Animated.View>
    );
  };
}

const AnimatedHomeScreen = withTabTransition(HomeScreen);
const AnimatedCallsScreen = withTabTransition(CallsScreen);
const AnimatedChatsScreen = withTabTransition(ChatsScreen);
const AnimatedWalletScreen = withTabTransition(WalletScreen);
const AnimatedProfileStackNavigator = withTabTransition(ProfileStackNavigator);

/**
 * Custom tab bar. React Navigation's default `tabBarIcon` renders both the
 * active AND inactive icon for every tab simultaneously (crossfading them
 * via opacity — see @react-navigation/bottom-tabs' TabBarIcon.tsx), so a
 * `focused` prop received by a single icon component instance never
 * actually toggles at runtime — it's constant for that instance's whole
 * lifetime, which silently killed the ripple/color animations entirely.
 * Rendering the bar ourselves gives each tab exactly one `TabIcon` instance
 * with a real, live `focused` value from navigation state.
 */
function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const badges = useBadges(isAuthenticated);

  /**
   * Opening a dot surface clears it. Fired on press rather than on focus so a
   * tab restored from background does not silently mark things seen the user
   * never actually looked at.
   */
  function clearDot(route: keyof MainTabParamList): void {
    const surface = route === 'CallsTab' ? 'calls' : route === 'WalletTab' ? 'wallet' : null;
    if (!surface) return;
    void markSurfaceSeen(surface)
      .then(() => queryClient.invalidateQueries({ queryKey: badgesQueryKey() }))
      .catch(() => undefined);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.navBackground,
        // Plain fixed height — AppSafeArea at the root already keeps the whole
        // app clear of the navigation bar, so adding the inset here again would
        // leave a nav-bar-sized gap under the tabs.
        height: TAB_BAR_HEIGHT,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          clearDot(route.name as keyof MainTabParamList);
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <TabIcon
              route={route.name as keyof MainTabParamList}
              focused={focused}
              badge={badgeFor(route.name as keyof MainTabParamList, badges)}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={AnimatedHomeScreen} options={{ headerShown: true, header: HomeTabHeader }} />
      <Tab.Screen name="CallsTab" component={AnimatedCallsScreen} options={{ headerShown: true, header: TabKycBannerHeader }} />
      <Tab.Screen name="ChatsTab" component={AnimatedChatsScreen} options={{ headerShown: true, header: TabKycBannerHeader }} />
      <Tab.Screen name="WalletTab" component={AnimatedWalletScreen} options={{ headerShown: true, header: TabKycBannerHeader }} />
      <Tab.Screen name="ProfileTab" component={AnimatedProfileStackNavigator} options={{ headerShown: true, header: TabKycBannerHeader }} />
    </Tab.Navigator>
  );
}
