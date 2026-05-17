<template>
  <q-card v-if="activeAnalysis" flat bordered class="bq-control-surface bq-flow-overview">
    <div class="bq-section-kicker">Repo flows</div>
    <div class="bq-card-title">{{ activeAnalysis.repo.name }}</div>
    <p class="bq-muted bq-measure">{{ activeAnalysis.repo.summary }}</p>

    <div class="bq-flow-list q-mt-lg">
      <button
        v-for="flow in activeAnalysis.flows"
        :key="flow.id"
        class="bq-flow-row"
        :class="{ 'is-active': flow.id === activeFlow?.id }"
        type="button"
        @click="selectFlow(flow.id)"
      >
        <span class="bq-flow-row-main">
          <span class="bq-flow-title">{{ flow.title }}</span>
          <span class="bq-flow-summary">{{ flow.summary }}</span>
        </span>
        <span class="bq-flow-meta">
          <q-chip dense size="sm" :label="flow.type.replaceAll('_', ' ')" />
          <q-chip dense size="sm" :label="flow.onboarding_suitability" />
        </span>
      </button>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { activeAnalysis, activeFlow, selectFlow } from 'src/state/bobquestStore';
</script>
