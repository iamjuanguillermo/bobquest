<template>
  <q-card v-if="activeFlow" flat bordered class="bq-control-surface bq-step-surface">
    <div class="bq-step-heading">
      <div>
        <div class="bq-section-kicker">Recommended flow</div>
        <div class="bq-card-title">{{ activeFlow.title }}</div>
      </div>
      <q-chip dense square :label="activeFlow.risk + ' risk'" />
    </div>

    <p class="bq-muted bq-measure">{{ activeFlow.why_it_matters }}</p>

    <div class="bq-step-tabs q-mt-lg">
      <button
        v-for="step in activeFlow.steps"
        :key="step.id"
        type="button"
        class="bq-step-tab"
        :class="{ 'is-active': step.id === activeStep?.id }"
        @click="selectStep(step.id)"
      >
        {{ step.title }}
      </button>
    </div>

    <q-separator class="q-my-lg" />

    <div v-if="activeStep" class="bq-active-step">
      <div class="bq-section-kicker">Active flow step</div>
      <div class="bq-subtitle">{{ activeStep.title }}</div>
      <p class="bq-muted bq-measure">{{ activeStep.summary }}</p>

      <div class="bq-reveal-actions">
        <q-btn no-caps flat color="primary" icon="article" label="Bob explanation" @click="openExplanationDrawer" />
        <q-btn no-caps flat color="primary" icon="source" label="Evidence" @click="openEvidenceDrawer" />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { activeFlow, activeStep, openEvidenceDrawer, openExplanationDrawer, selectStep } from 'src/state/bobquestStore';
</script>
