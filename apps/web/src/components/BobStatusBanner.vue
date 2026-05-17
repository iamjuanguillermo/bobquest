<template>
  <q-banner dense rounded class="bq-status-pill" :class="bannerClass">
    <template #avatar><q-icon :name="icon" /></template>
    <span>{{ label }}</span>
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { state } from 'src/state/bobquestStore';

const label = computed(() => {
  if (state.capabilities.bobShellRuntime.available) return 'IBM Bob Shell runtime ready';
  if (state.capabilities.bobShellRuntime.message) return state.capabilities.bobShellRuntime.message;
  if (state.capabilities.bobShellRuntime.status === 'disabled') return 'Runtime disabled by configuration';
  if (state.capabilities.bobShellRuntime.status === 'not_configured') return 'IBM Bob Shell runtime not configured';
  if (state.capabilities.bobShellRuntime.status === 'binary_not_found') return 'IBM Bob Shell binary not found';
  if (state.capabilities.bobShellRuntime.status === 'auth_invalid') return 'IBM Bob Shell authentication invalid';
  if (state.capabilities.bobShellRuntime.status === 'preflight_failed') return 'IBM Bob Shell preflight failed';
  return 'Runtime connection pending';
});

const icon = computed(() => (state.capabilities.bobShellRuntime.available ? 'verified' : 'sensors_off'));
const bannerClass = computed(() => (state.capabilities.bobShellRuntime.available ? 'bg-green-1 text-positive' : 'bg-grey-2 text-grey-9'));
</script>
