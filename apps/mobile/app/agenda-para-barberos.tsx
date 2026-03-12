import { router } from 'expo-router';
import {
  publicMarketingAgendaBenefits,
  publicMarketingAgendaHero,
  publicMarketingAgendaWorkflowSteps,
} from '@navaja/shared';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Card,
  HeroPanel,
  Screen,
  SurfaceCard,
} from '../components/ui/primitives';
import { PlatformQuickLinks } from '../components/marketing/platform-quick-links';
import { useNavajaTheme } from '../lib/theme';

export default function AgendaParaBarberosScreen() {
  const { colors } = useNavajaTheme();

  return (
    <Screen
      eyebrow="Operacion"
      title="Agenda para barberos"
      subtitle="La app conserva la misma promesa de producto que web, traducida a un layout nativo con pasos operativos y beneficios concretos."
    >
      <HeroPanel
        eyebrow={publicMarketingAgendaHero.eyebrow}
        title={publicMarketingAgendaHero.title}
        description={publicMarketingAgendaHero.description}
      >
        <View style={styles.actionRow}>
          <ActionButton
            label="Probar reservas"
            onPress={() => router.push('/shops')}
            style={styles.actionButton}
          />
          <ActionButton
            label="Ver plataforma completa"
            variant="secondary"
            onPress={() => router.push('/software-para-barberias')}
            style={styles.actionButton}
          />
        </View>
      </HeroPanel>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Flujo operativo</Text>
        <View style={styles.list}>
          {publicMarketingAgendaWorkflowSteps.map((step, index) => (
            <SurfaceCard key={step} style={styles.itemCard}>
              <Text style={[styles.stepEyebrow, { color: colors.textMuted }]}>Paso {index + 1}</Text>
              <Text style={[styles.itemCopy, { color: colors.text }]}>{step}</Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Beneficios clave</Text>
        <View style={styles.list}>
          {publicMarketingAgendaBenefits.map((benefit) => (
            <SurfaceCard key={benefit.title} style={styles.itemCard}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{benefit.title}</Text>
              <Text style={[styles.itemCopy, { color: colors.textMuted }]}>
                {benefit.description}
              </Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <PlatformQuickLinks excludeHrefs={['/agenda-para-barberos']} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  stepEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
