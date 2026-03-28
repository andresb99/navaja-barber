import { Separator as HeroSeparator } from 'heroui-native';

export function Divider({ className }: { className?: string }) {
  return <HeroSeparator variant="thin" className={className ?? 'my-2'} />;
}
