<template>
  <q-card flat bordered class="bq-control-surface bq-status-surface">
    <div class="bq-section-kicker">Run state</div>
    <div class="bq-card-title">{{ statusTitle }}</div>
    <p class="bq-muted bq-measure">{{ state.run.message }}</p>

    <q-banner v-if="state.run.error" rounded dense class="bg-red-1 text-negative q-mt-md">
      <template #avatar><q-icon name="error" /></template>
      {{ state.run.error }}
    </q-banner>

    <div class="bq-state-rail q-mt-lg">
      <div v-for="item in states" :key="item.id" class="bq-state-step" :class="{ 'is-active': item.id === state.run.status }">
        <span class="bq-state-dot" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <q-btn no-caps class="q-mt-lg full-width" color="primary" unelevated icon-right="arrow_forward" label="Open onboarding" to="/onboarding" :disable="!state.run.ready" />
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { state, type RunStateStatus } from 'src/state/bobquestStore';

const states: Array<{ id: RunStateStatus; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'creating_workspace', label: 'Creating workspace' },
  { id: 'cloning_repo', label: 'Cloning repository' },
  { id: 'running_bob_analysis', label: 'Running IBM Bob analysis' },
  { id: 'parsing_bob_output', label: 'Parsing Bob output' },
  { id: 'ready', label: 'Ready' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' }
];

const statusTitle = computed(() => {
  if (state.run.status === 'failed') return 'Runtime required';
  if (state.run.ready) return 'Onboarding ready';
  return 'Waiting for real runtime output';
});
</script>
