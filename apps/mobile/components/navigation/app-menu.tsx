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
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { Button as HeroButton } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthContext, type AppRole, type AuthContext } from '../../lib/auth';
import { useNavajaTheme } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: IconName;
}

interface MenuSection {
  key: string;
  title: string;
  items: MenuItem[];
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

function buildMenuSections(auth: AuthContext): MenuSection[] {
  const sections: MenuSection[] = [
    {
      key: 'explore',
      title: 'Explorar',
      items: [
        {
          key: 'home',
          label: 'Inicio',
          description: 'Marketplace principal con mapa, barberias y busqueda.',
          href: '/(tabs)/inicio',
          icon: 'sparkles-outline',
        },
        {
          key: 'booking',
          label: 'Reservas',
          description: 'Agenda publica de servicios, staff y horarios.',
          href: '/(tabs)/reservas',
          icon: 'calendar-outline',
        },
        {
          key: 'courses',
          label: 'Cursos',
          description: 'Catalogo formativo con el mismo marketplace que web.',
          href: '/(tabs)/cursos',
          icon: 'school-outline',
        },
        {
          key: 'models',
          label: 'Modelos',
          description: 'Convocatorias abiertas y registro de perfiles.',
          href: '/(tabs)/modelos',
          icon: 'people-outline',
        },
        {
          key: 'jobs',
          label: 'Empleo',
          description: 'Postulaciones directas o a la bolsa general.',
          href: '/(tabs)/empleo',
          icon: 'briefcase-outline',
        },
      ],
    },
    {
      key: 'product',
      title: 'Producto',
      items: [
        {
          key: 'software',
          label: 'Software',
          description: 'Narrativa comercial y beneficios de la plataforma.',
          href: '/software-para-barberias',
          icon: 'desktop-outline',
        },
        {
          key: 'agenda',
          label: 'Agenda',
          description: 'Vista publica de agenda para barberos.',
          href: '/agenda-para-barberos',
          icon: 'timer-outline',
        },
        {
          key: 'subscription',
          label: 'Suscripcion',
          description: 'Planes, checkout y estado de billing.',
          href: '/suscripcion',
          icon: 'card-outline',
        },
      ],
    },
  ];

  if (auth.userId) {
    sections.push({
      key: 'account',
      title: 'Cuenta',
      items: [
        {
          key: 'account-home',
          label: 'Mi cuenta',
          description: 'Perfil, notificaciones, reservas e invitaciones.',
          href: '/(tabs)/cuenta',
          icon: 'person-circle-outline',
        },
        {
          key: 'workspaces',
          label: 'Mis barberias',
          description: 'Selector de workspace y accesos por barberia.',
          href: '/mis-barberias',
          icon: 'business-outline',
        },
      ],
    });
  }

  if (auth.role === 'staff' || auth.role === 'admin') {
    sections.push({
      key: 'ops',
      title: 'Operacion',
      items: [
        {
          key: 'staff-panel',
          label: 'Panel staff',
          description: 'Turnos, jornada y tareas del equipo.',
          href: '/staff',
          icon: 'cut-outline',
        },
        ...(auth.role === 'admin'
          ? [
              {
                key: 'admin-panel',
                label: 'Panel admin',
                description: 'Gestion operativa de barberia.',
                href: '/admin',
                icon: 'speedometer-outline' as IconName,
              },
              {
                key: 'admin-metrics',
                label: 'Metricas',
                description: 'KPIs, revenue, canales y performance.',
                href: '/admin/metrics',
                icon: 'analytics-outline' as IconName,
              },
              {
                key: 'admin-notifications',
                label: 'Notificaciones',
                description: 'Solicitudes, alertas y pendientes admin.',
                href: '/admin/notifications',
                icon: 'notifications-outline' as IconName,
              },
            ]
          : []),
      ],
    });
  }

  sections.push({
    key: 'session',
    title: 'Sesion',
    items: auth.userId
      ? [
          {
            key: 'logout',
            label: 'Cerrar sesion',
            description: 'Salir de la cuenta actual en este dispositivo.',
            href: '/auth/logout',
            icon: 'log-out-outline',
          },
        ]
      : [
          {
            key: 'login',
            label: 'Ingresar',
            description: 'Acceder, registrarte o recuperar tu cuenta.',
            href: '/(auth)/login',
            icon: 'log-in-outline',
          },
        ],
  });

  return sections;
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

  const sections = useMemo(() => buildMenuSections(resolvedAuth), [resolvedAuth]);
  const roleLabel = roleLabelByRole[resolvedAuth.role];
  const workspaceLabel = resolvedAuth.shopName || 'Sin barberia activa';
  const overlayColor = colors.overlayBackdrop;
  const drawerTopPadding = insets.top + 14;
  const drawerBottomPadding = Math.max(insets.bottom + 14, 24);
  const toneColor =
    resolvedAuth.role === 'admin'
      ? colors.success
      : resolvedAuth.role === 'staff'
        ? colors.warning
        : colors.textAccent;

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
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: overlayColor }]}
            onPress={closeMenu}
          />

          <View
            style={[
              styles.drawer,
              {
                paddingTop: drawerTopPadding,
                paddingBottom: drawerBottomPadding,
                borderColor: colors.border,
                backgroundColor: colors.panelStrong,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <LinearGradient
              colors={[colors.heroGradientStart, colors.heroGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.drawerContent}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerTitleBlock}>
                  <Text style={[styles.drawerEyebrow, { color: colors.textMuted }]}>
                    Navaja app
                  </Text>
                  <Text style={[styles.drawerTitle, { color: colors.text }]}>
                    Navegacion global
                  </Text>
                  <Text style={[styles.drawerSubtitle, { color: colors.textSoft }]}>
                    {workspaceLabel}
                  </Text>
                </View>

                <HeroButton
                  isIconOnly
                  variant="secondary"
                  onPress={closeMenu}
                  className="rounded-[14px]"
                  style={[
                    styles.closeButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.panelRaised,
                    },
                  ]}
                >
                  <Ionicons name="close-outline" size={20} color={colors.text} />
                </HeroButton>
              </View>

              <View
                style={[
                  styles.identityCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.panelRaised,
                  },
                ]}
              >
                <View style={[styles.identityDot, { backgroundColor: toneColor }]} />
                <View style={styles.identityCopy}>
                  <Text style={[styles.identityLabel, { color: colors.textMuted }]}>
                    Rol activo
                  </Text>
                  <Text style={[styles.identityValue, { color: colors.text }]}>
                    {roleLabel}
                  </Text>
                </View>
                <Text style={[styles.identityMeta, { color: colors.textSoft }]}>
                  {resolvedAuth.workspaces.length} workspace
                  {resolvedAuth.workspaces.length === 1 ? '' : 's'}
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sectionsWrap}
              >
                {loading ? (
                  <View
                    style={[
                      styles.stateCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.panelRaised,
                      },
                    ]}
                  >
                    <Text style={[styles.stateText, { color: colors.textMuted }]}>
                      Cargando accesos...
                    </Text>
                  </View>
                ) : (
                  sections.map((section) => (
                    <View
                      key={section.key}
                      style={[
                        styles.sectionCard,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.panelRaised,
                        },
                      ]}
                    >
                      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        {section.title}
                      </Text>

                      <View style={styles.itemsWrap}>
                        {section.items.map((item) => {
                          const active = isMenuItemActive(pathname, item.href);

                          return (
                            <Pressable
                              key={item.key}
                              onPress={() => navigateTo(item.href)}
                              style={[
                                styles.itemRow,
                                {
                                  borderColor: active ? colors.borderActive : colors.borderMuted,
                                  backgroundColor: active ? colors.pillActive : colors.panel,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.itemIconWrap,
                                  {
                                    borderColor: active ? colors.borderActive : colors.borderMuted,
                                    backgroundColor: active ? colors.panelStrong : colors.panelMuted,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={item.icon}
                                  size={18}
                                  color={active ? colors.textAccent : colors.text}
                                />
                              </View>

                              <View style={styles.itemCopy}>
                                <Text style={[styles.itemLabel, { color: colors.text }]}>
                                  {item.label}
                                </Text>
                                <Text
                                  style={[styles.itemDescription, { color: colors.textMuted }]}
                                  numberOfLines={2}
                                >
                                  {item.description}
                                </Text>
                              </View>

                              <Ionicons
                                name="chevron-forward-outline"
                                size={18}
                                color={active ? colors.textAccent : colors.textMuted}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    position: 'relative',
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    width: '88%',
    maxWidth: 392,
    minHeight: '100%',
    borderLeftWidth: 1,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowOffset: { width: -6, height: 0 },
    shadowRadius: 20,
    elevation: 6,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 18,
    gap: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  drawerTitleBlock: {
    flex: 1,
    gap: 3,
  },
  drawerEyebrow: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawerTitle: {
    fontSize: 26,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.45,
  },
  drawerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  identityCopy: {
    flex: 1,
    gap: 1,
  },
  identityLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  identityValue: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  identityMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  sectionsWrap: {
    gap: 14,
    paddingBottom: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  itemsWrap: {
    gap: 10,
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stateText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
