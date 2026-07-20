import { Text, View } from 'react-native';

/**
 * Temporary stand-in for a navigator screen whose real implementation
 * hasn't been built yet in docs/mobile-work/todo.md's Part 5 checklist.
 * Exists so the navigator graph is fully wired (every route splash/guards
 * can reset() to actually resolves) before every screen exists. Each usage
 * is removed the moment that screen's real implementation lands — never
 * add features to this component itself.
 */
export function RouteNotBuiltYet({ name }: { name: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center font-sans-semibold text-lg text-textPrimary">{name}</Text>
      <Text className="mt-2 text-center font-sans text-sm text-textMuted">
        Not built yet — see docs/mobile-work/todo.md Part 5.
      </Text>
    </View>
  );
}
