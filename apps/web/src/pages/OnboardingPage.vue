<template>
  <q-page class="bq-page-shell">
    <section class="bq-onboarding-shell">
      <LockedOnboarding v-if="!state.run.ready" />

      <template v-else-if="activeAnalysis && activeFlow">
        <LocalizationControls />
        <div class="bq-onboarding-grid">
          <aside class="bq-onboarding-side">
            <FlowOverview />
          </aside>
          <main class="bq-onboarding-main">
            <FlowStepPanel />
            <StarterMissionPanel />
          </main>
        </div>
        <EvidenceDrawer />
        <BobExplanationDrawer />
        <TranslationOverlay />
      </template>

      <FlowPlaceholder v-else />
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { activeAnalysis, activeFlow, state } from 'src/state/bobquestStore';
import BobExplanationDrawer from 'src/features/onboarding/BobExplanationDrawer.vue';
import EvidenceDrawer from 'src/features/onboarding/EvidenceDrawer.vue';
import FlowOverview from 'src/features/onboarding/FlowOverview.vue';
import LocalizationControls from 'src/features/onboarding/LocalizationControls.vue';
import TranslationOverlay from 'src/features/onboarding/TranslationOverlay.vue';
import FlowPlaceholder from 'src/features/onboarding/FlowPlaceholder.vue';
import FlowStepPanel from 'src/features/onboarding/FlowStepPanel.vue';
import LockedOnboarding from 'src/features/onboarding/LockedOnboarding.vue';
import StarterMissionPanel from 'src/features/onboarding/StarterMissionPanel.vue';
</script>
