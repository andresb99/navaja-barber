import { Avatar as HeroAvatar } from 'heroui-native';

export function UserAvatar({
  url,
  initials,
  size = 'md',
}: {
  url?: string | null;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <HeroAvatar size={size} color="accent" animation="disable-all" alt={initials || 'Avatar'}>
      {url ? (
        <HeroAvatar.Image source={{ uri: url }} />
      ) : null}
      <HeroAvatar.Fallback>{initials || ''}</HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
