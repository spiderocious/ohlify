import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, colors } from '@ohlify/mobile-ui';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../../app.navigation';
import { OnboardingSlide, type OnboardingSlideData } from './parts/onboarding-slide';

/**
 * Mirrors mobile/lib/features/onboarding/screen/onboarding_screen.dart:
 * auto-advancing slide carousel (3s interval), paused while the user is
 * dragging, plus static Get Started / Login buttons below.
 *
 * RN has no PageView.builder equivalent — a horizontally paging ScrollView
 * with manual scrollTo(index * screenWidth) reproduces the same swipe +
 * programmatic-advance behavior.
 */
const SLIDES: OnboardingSlideData[] = [
  {
    title: 'Get Paid for Calls',
    subtitle: 'Set your rate. Share your link. Get paid per minute.',
  },
  {
    title: 'Connect with other experts',
    subtitle:
      'Connect with top-tier professionals across industries. Skip the back and forth emails and book a session',
  },
  {
    title: 'Ready to level up',
    subtitle:
      'Set up your profile in seconds and find the perfect mentor, consultant or specialist to help you reach your goals',
  },
];

const AUTO_SCROLL_INTERVAL_MS = 3000;

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const isUserScrollingRef = useRef(false);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const timer = setInterval(() => {
      if (isUserScrollingRef.current) return;
      const next = (currentPage + 1) % SLIDES.length;
      scrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
      setCurrentPage(next);
    }, AUTO_SCROLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [currentPage, screenWidth]);

  function onMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentPage(page);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
        <SlideIndicator count={SLIDES.length} current={currentPage} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          isUserScrollingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isUserScrollingRef.current = false;
        }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={{ width: screenWidth }}>
            <OnboardingSlide data={slide} />
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <AppButton
          label="Get started"
          expanded
          radius={100}
          onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
        />
        <View style={{ height: 12 }} />
        <AppButton
          label="Login"
          variant="outline"
          expanded
          radius={100}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
        />
      </View>
    </SafeAreaView>
  );
}

function SlideIndicator({ count, current }: { count: number; current: number }) {
  return (
    <View className="flex-row">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            marginRight: i < count - 1 ? 6 : 0,
            backgroundColor: i === current ? colors.primary : colors.secondary,
          }}
        />
      ))}
    </View>
  );
}
