import { NETWORK_QUALITY_LEVEL, type NetworkQualityLevel } from '@shared/bridge/bridge.types.js';

interface Props {
  uplink: NetworkQualityLevel;
  downlink: NetworkQualityLevel;
}

function qualityColor(level: NetworkQualityLevel): string {
  if (level === NETWORK_QUALITY_LEVEL.UNKNOWN) return 'text-zinc-500';
  if (level <= NETWORK_QUALITY_LEVEL.GOOD) return 'text-green-400';
  if (level <= NETWORK_QUALITY_LEVEL.POOR) return 'text-yellow-400';
  return 'text-red-400';
}

function qualityLabel(level: NetworkQualityLevel): string {
  switch (level) {
    case NETWORK_QUALITY_LEVEL.EXCELLENT:
      return 'Excellent';
    case NETWORK_QUALITY_LEVEL.GOOD:
      return 'Good';
    case NETWORK_QUALITY_LEVEL.POOR:
      return 'Poor';
    case NETWORK_QUALITY_LEVEL.BAD:
      return 'Bad';
    case NETWORK_QUALITY_LEVEL.VERY_BAD:
      return 'Very bad';
    case NETWORK_QUALITY_LEVEL.DOWN:
      return 'Down';
    default:
      return '';
  }
}

export function NetworkIndicator({ uplink, downlink }: Props) {
  const worst = Math.max(uplink, downlink) as NetworkQualityLevel;
  if (worst === NETWORK_QUALITY_LEVEL.UNKNOWN || worst <= NETWORK_QUALITY_LEVEL.GOOD) return null;

  return (
    <span className={`text-xs font-medium ${qualityColor(worst)}`}>
      Network: {qualityLabel(worst)}
    </span>
  );
}
