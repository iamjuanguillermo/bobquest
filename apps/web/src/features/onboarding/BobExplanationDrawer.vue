<template>
  <q-drawer
    :model-value="state.ui.onboarding.explanationDrawerOpen"
    side="right"
    overlay
    bordered
    :width="420"
    class="bq-detail-drawer"
    @update:model-value="onUpdate"
  >
    <div class="bq-drawer-content">
      <div class="bq-drawer-topline">
        <div>
          <div class="bq-section-kicker">IBM Bob explanation</div>
          <div class="bq-drawer-title">Why this step matters</div>
        </div>
        <q-btn no-caps flat round dense icon="close" aria-label="Close explanation" @click="closeExplanationDrawer" />
      </div>

      <template v-if="activeStep">
        <p class="bq-drawer-prose">{{ activeStep.bob_explanation }}</p>
      </template>
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { activeStep, closeExplanationDrawer, state } from 'src/state/bobquestStore';

function onUpdate(value: boolean) {
  if (!value) closeExplanationDrawer();
}
</script>
