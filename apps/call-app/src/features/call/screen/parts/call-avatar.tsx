interface Props {
  name: string;
  avatarKey: string | null;
  size?: 'sm' | 'lg';
}

export function CallAvatar({ name, avatarKey, size = 'lg' }: Props) {
  const dim = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-12 h-12 text-base';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (avatarKey) {
    return <img src={avatarKey} alt={name} className={`${dim} rounded-full object-cover`} />;
  }

  return (
    <div
      className={`${dim} rounded-full bg-zinc-700 flex items-center justify-center font-semibold text-white`}
    >
      {initials}
    </div>
  );
}
