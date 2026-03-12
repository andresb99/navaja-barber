import { router } from 'expo-router';
import {
  publicMarketingSoftwareFaqs,
  publicMarketingSoftwareHero,
  publicMarketingSoftwareSections,
} from '@navaja/shared';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Card,
  HeroPanel,
  Screen,
  StatTile,
  SurfaceCard,
} from '../components/ui/primitives';
import { PlatformQuickLinks } from '../components/marketing/platform-quick-links';
import { useNavajaTheme } from '../lib/theme';

export default function SoftwareParaBarberiasScreen() {
  const { colors } = useNavajaTheme();

  return (
    <Screen
      eyebrow="Plataforma"
      title="Software para barberias"
      subtitle="La app replica la narrativa principal de web para explicar agenda, pagos, operaciones y crecimiento desde una superficie nativa."
    >
      <HeroPanel
        eyebrow={publicMarketingSoftwareHero.eyebrow}
        title={publicMarketingSoftwareHero.title}
        description={publicMarketingSoftwareHero.description}
      >
        <View style={styles.statsRow}>
          {publicMarketingSoftwareHero.stats.map((item) => (
            <StatTile key={item.label} label={item.label} value={item.value} />
          ))}
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            label="Ver planes"
            onPress={() => router.push('/suscripcion')}
            style={styles.actionButton}
          />
          <ActionButton
            label="Ver marketplace"
            variant="secondary"
            onPress={() => router.push('/shops')}
            style={styles.actionButton}
          />
        </View>
      </HeroPanel>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Que resuelve</Text>
        <View style={styles.list}>
          {publicMarketingSoftwareSections.map((section) => (
            <SurfaceCard key={section.title} style={styles.itemCard}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.itemCopy, { color: colors.textMuted }]}>
                {section.description}
              </Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>FAQ para barberias</Text>
        <View style={styles.list}>
          {publicMarketingSoftwareFaqs.map((item) => (
            <SurfaceCard key={item.question} style={styles.itemCard}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.question}</Text>
              <Text style={[styles.itemCopy, { color: colors.textMuted }]}>{item.answer}</Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <PlatformQuickLinks excludeHrefs={['/software-para-barberias']} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
});
