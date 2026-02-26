declare module '@/components/Orb' {
  import type { FC } from 'react';

  export interface OrbProps {
    hue?: number;
    hoverIntensity?: number;
    rotateOnHover?: boolean;
    forceHoverState?: boolean;
    backgroundColor?: string;
  }

  const Orb: FC<OrbProps>;
  export default Orb;
}

declare module '@/components/GlassSurface' {
  import type { CSSProperties, FC, ReactNode } from 'react';

  export interface GlassSurfaceProps {
    children?: ReactNode;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    borderWidth?: number;
    brightness?: number;
    opacity?: number;
    blur?: number;
    displace?: number;
    backgroundOpacity?: number;
    saturation?: number;
    distortionScale?: number;
    redOffset?: number;
    greenOffset?: number;
    blueOffset?: number;
    xChannel?: string;
    yChannel?: string;
    mixBlendMode?: string;
    className?: string;
    style?: CSSProperties;
  }

  const GlassSurface: FC<GlassSurfaceProps>;
  export default GlassSurface;
}

declare module '@/components/FadeContent' {
  import type { CSSProperties, FC, ReactNode } from 'react';

  export interface FadeContentProps {
    children?: ReactNode;
    container?: Element | string | null;
    blur?: boolean;
    duration?: number;
    ease?: string;
    delay?: number;
    threshold?: number;
    initialOpacity?: number;
    disappearAfter?: number;
    disappearDuration?: number;
    disappearEase?: string;
    onComplete?: () => void;
    onDisappearanceComplete?: () => void;
    className?: string;
    style?: CSSProperties;
    id?: string;
  }

  const FadeContent: FC<FadeContentProps>;
  export default FadeContent;
}
