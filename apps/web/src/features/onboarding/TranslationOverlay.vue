<template>
  <transition name="bq-translation-fade">
    <div v-if="state.ui.onboarding.translating" class="bq-translation-overlay" role="status" aria-live="polite">
      <q-spinner size="48px" color="primary" />
      <div class="bq-translation-title">Translating BobQuest onboarding...</div>
      <div class="bq-muted text-center">Original IBM Bob analysis remains preserved.</div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { state } from 'src/state/bobquestStore';
</script>
