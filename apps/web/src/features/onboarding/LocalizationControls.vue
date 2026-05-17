<template>
  <q-card v-if="canLocalize()" flat bordered class="bq-localization-card">
    <div class="bq-localization-row">
      <div>
        <div class="bq-section-kicker">Language</div>
        <div class="text-weight-bold">Translate BobQuest onboarding</div>
        <div class="text-caption bq-muted">IBM watsonx localizes dynamic content while preserving file paths and commands.</div>
      </div>
      <q-select
        dense
        outlined
        emit-value
        map-options
        :model-value="state.run.activeLanguage"
        :options="languageOptions"
        aria-label="Onboarding language"
        class="bq-language-select"
        @update:model-value="changeLanguage(String($event))"
      />
    </div>
    <q-banner v-if="state.ui.onboarding.translationError" rounded dense class="q-mt-md bg-orange-1 text-orange-10">
      <template #avatar><q-icon name="translate" /></template>
      {{ state.ui.onboarding.translationError }}
    </q-banner>
  </q-card>
</template>

<script setup lang="ts">
import { canLocalize, changeLanguage, state } from 'src/state/bobquestStore';

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Português', value: 'pt' }
];
</script>
