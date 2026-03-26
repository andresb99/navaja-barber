import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Button as HeroButton } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthContext, type AppRole, type AuthContext } from '../../lib/auth';
import { useNavajaTheme } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

const roleLabelByRole: Record<AppRole, string> = {
  guest: 'Invitado',
  user: 'Cliente',
  staff: 'Staff',
  admin: 'Admin',
};

function normalizeMenuPath(value: string) {
  const normalized = value
    .replace(/\/\((tabs|auth)\)/g, '')
    .replace(/\/index$/g, '')
    .replace(/\/+/g, '/');

  return normalized || '/';
}

function isMenuItemActive(pathname: string, href: string) {
  const currentPath = normalizeMenuPath(pathname);
  const targetPath = normalizeMenuPath(href);

  if (targetPath === '/') {
    return currentPath === '/';
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function buildMenuItems(auth: AuthContext): MenuItem[] {
  const items: MenuItem[] = [
    {
      key: 'home',
      label: 'Barberias',
      href: '/(tabs)/inicio',
      icon: 'sparkles-outline',
    },
    {
      key: 'booking',
      label: 'Agendar',
      href: '/(tabs)/reservas',
      icon: 'calendar-outline',
    },
    {
      key: 'courses',
      label: 'Cursos',
      href: '/(tabs)/cursos',
      icon: 'school-outline',
    },
    {
      key: 'models',
      label: 'Modelos',
      href: '/(tabs)/modelos',
      icon: 'people-outline',
    },
    {
      key: 'jobs',
      label: 'Empleo',
      href: '/(tabs)/empleo',
      icon: 'briefcase-outline',
    },
  ];

  if (auth.role === 'staff' || auth.role === 'admin') {
    items.push({
      key: 'staff-panel',
      label: 'Panel staff',
      href: '/staff',
      icon: 'cut-outline',
    });
  }

  if (auth.role === 'admin') {
    items.push({
      key: 'admin-panel',
      label: 'Admin',
      href: '/admin',
      icon: 'speedometer-outline',
    });
  }

  if (auth.userId) {
    items.push({
      key: 'account-home',
      label: 'Mi cuenta',
      href: '/(tabs)/cuenta',
      icon: 'person-circle-outline',
    });
    items.push({
      key: 'logout',
      label: 'Cerrar sesión',
      href: '/auth/logout',
      icon: 'log-out-outline',
    });
  } else {
    items.push({
      key: 'login',
      label: 'Ingresar',
      href: '/(auth)/login',
      icon: 'log-in-outline',
    });
  }

  return items;
}

export function AppMenuButton({
  style,
  iconSize = 20,
}: {
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useNavajaTheme();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState<AuthContext | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let active = true;
    setLoading(true);

    void getAuthContext()
      .then((ctx) => {
        if (active) {
          setAuth(ctx);
        }
      })
      .catch(() => {
        if (active) {
          setAuth(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [visible, pathname]);

  const resolvedAuth =
    auth ||
    ({
      role: 'guest',
      userId: null,
      email: null,
      staffId: null,
      staffName: null,
      shopId: null,
      shopName: null,
      shopSlug: null,
      workspaces: [],
    } satisfies AuthContext);

  const items = useMemo(() => buildMenuItems(resolvedAuth), [resolvedAuth]);
  const roleLabel = roleLabelByRole[resolvedAuth.role];
  const isDark = colors.mode === 'dark';

  function closeMenu() {
    setVisible(false);
  }

  function navigateTo(href: string) {
    closeMenu();
    setTimeout(() => {
      router.push(href as never);
    }, 90);
  }

  return (
    <>
      <HeroButton
        isIconOnly
        variant="secondary"
        onPress={() => setVisible(true)}
        className="rounded-[16px]"
        style={[
          styles.triggerButton,
          {
            borderColor: colors.border,
            shadowColor: colors.shadow,
            backgroundColor: colors.panelRaised,
          },
          style,
        ]}
        accessibilityLabel="Abrir menu de navegacion"
      >
        <Ionicons name="menu-outline" size={iconSize} color={colors.text} />
      </HeroButton>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Backdrop — dims page behind and dismisses on tap */}
          <Pressable
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)' },
            ]}
            onPress={closeMenu}
          />

          {/* Overlay panel */}
          <View
            style={[
              styles.panel,
              {
                backgroundColor: isDark
                  ? 'rgba(9, 9, 11, 0.96)'
                  : 'rgba(255, 255, 255, 0.97)',
              },
            ]}
          >

            {/* Violet aura top-right */}
            <View
              pointerEvents="none"
              style={[
                styles.auraTopRight,
                {
                  backgroundColor: isDark
                    ? 'rgba(139, 92, 246, 0.12)'
                    : 'rgba(139, 92, 246, 0.14)',
                },
              ]}
            />
            {/* Fuchsia aura bottom-left */}
            <View
              pointerEvents="none"
              style={[
                styles.auraBottomLeft,
                {
                  backgroundColor: isDark
                    ? 'rgba(217, 70, 239, 0.06)'
                    : 'rgba(217, 70, 239, 0.09)',
                },
              ]}
            />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons
                  name="cut-outline"
                  size={22}
                  color={isDark ? colors.textAccent : colors.accent}
                />
                <Text style={[styles.logoText, { color: colors.text }]}>
                  Beardly
                </Text>
              </View>

              <View style={styles.headerActions}>
                <HeroButton
                  isIconOnly
                  variant="secondary"
                  onPress={closeMenu}
                  className="rounded-[14px]"
                  style={[
                    styles.closeButton,
                    {
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.12)'
                        : colors.border,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : colors.panelRaised,
                    },
                  ]}
                >
                  <Ionicons name="close-outline" size={22} color={colors.text} />
                </HeroButton>
              </View>
            </View>

            {/* Role badge */}
            {!loading && (
              <View style={styles.roleBadge}>
                <View
                  style={[
                    styles.roleDot,
                    {
                      backgroundColor:
                        resolvedAuth.role === 'admin'
                          ? colors.success
                          : resolvedAuth.role === 'staff'
                            ? colors.warning
                            : colors.textAccent,
                    },
                  ]}
                />
                <Text style={[styles.roleText, { color: colors.textMuted }]}>
                  {roleLabel}
                </Text>
              </View>
            )}

            {/* Nav links */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.linksWrap}
            >
              {loading ? (
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Cargando…
                </Text>
              ) : (
                items.map((item) => {
                  const active = isMenuItemActive(pathname, item.href);

                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => navigateTo(item.href)}
                      style={styles.linkRow}
                    >
                      <Text
                        style={[
                          styles.linkLabel,
                          {
                            color: active
                              ? isDark
                                ? colors.textAccent
                                : colors.accent
                              : colors.text,
                            opacity: active ? 1 : 0.72,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {active && (
                        <View
                          style={[
                            styles.activeDot,
                            {
                              backgroundColor: isDark
                                ? colors.textAccent
                                : colors.accent,
                            },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    overflow: 'hidden',
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  panel: {
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    minHeight: '60%',
  },
  auraTopRight: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  auraBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 24,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.2,
  },
  linksWrap: {
    gap: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  linkLabel: {
    fontSize: 34,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    paddingVertical: 12,
  },
});
