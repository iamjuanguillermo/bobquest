<template>
  <div v-if="mission" class="bq-interaction-card">
    <div class="bq-small-label">Understanding checkpoint</div>
    <p class="q-mb-md">{{ mission.interaction.prompt }}</p>

    <template v-if="mission.interaction.type === 'single_choice'">
      <q-option-group
        :model-value="answerValue"
        :options="choiceOptions"
        type="radio"
        color="primary"
        @update:model-value="setMissionAnswer(mission.id, $event)"
      />
      <q-btn no-caps class="bq-action-btn q-mt-md" color="primary" unelevated label="Check locally" @click="completeActiveClosedMission" />
    </template>

    <template v-else-if="mission.interaction.type === 'multi_choice'">
      <q-option-group
        :model-value="Array.isArray(answerValue) ? answerValue : []"
        :options="choiceOptions"
        type="checkbox"
        color="primary"
        @update:model-value="setMissionAnswer(mission.id, $event)"
      />
      <q-btn no-caps class="bq-action-btn q-mt-md" color="primary" unelevated label="Check locally" @click="completeActiveClosedMission" />
    </template>

    <template v-else-if="mission.interaction.type === 'short_text'">
      <q-input
        :model-value="String(answerValue ?? '')"
        outlined
        autogrow
        label="Your answer"
        @update:model-value="setMissionAnswer(mission.id, $event)"
      />
      <q-btn no-caps class="bq-action-btn q-mt-md" color="primary" unelevated label="Check locally" @click="completeActiveClosedMission" />
    </template>

    <template v-else-if="mission.interaction.type === 'confirm_understanding'">
      <q-btn no-caps class="bq-action-btn" color="primary" unelevated :label="mission.interaction.confirmation_label" @click="confirmUnderstanding" />
    </template>

    <template v-else-if="mission.interaction.type === 'file_focus'">
      <q-option-group
        :model-value="Array.isArray(answerValue) ? answerValue : []"
        :options="fileFocusOptions"
        type="checkbox"
        color="primary"
        @update:model-value="setMissionAnswer(mission.id, $event)"
      />
      <q-btn no-caps class="bq-action-btn q-mt-md" color="primary" unelevated label="Complete file focus" @click="completeActiveClosedMission" />
    </template>

    <template v-else-if="mission.interaction.type === 'open_text_evaluated_by_bob'">
      <q-input
        :model-value="String(answerValue ?? '')"
        outlined
        autogrow
        label="Explain your understanding"
        @update:model-value="setMissionAnswer(mission.id, $event)"
      />
      <q-btn
        no-caps
        class="bq-action-btn q-mt-md"
        color="primary"
        unelevated
        icon="psychology"
        label="Evaluate with IBM Bob Shell"
        :loading="state.ui.onboarding.evaluatingMissionId === mission.id"
        @click="evaluateActiveOpenMission"
      />
    </template>

    <q-banner v-if="result" rounded dense class="q-mt-md" :class="result.correct ? 'bg-green-1 text-positive' : 'bg-orange-1 text-orange-10'">
      <template #avatar><q-icon :name="result.correct ? 'verified' : 'rule'" /></template>
      <div class="text-weight-bold">{{ result.status.replaceAll('_', ' ') }}</div>
      <div>{{ result.feedback }}</div>
    </q-banner>

    <q-banner v-if="error" rounded dense class="q-mt-md bg-red-1 text-negative">
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StarterMission } from '@bobquest/onboarding-contracts';
import {
  completeActiveClosedMission,
  evaluateActiveOpenMission,
  missionAnswer,
  missionError,
  missionResult,
  setMissionAnswer,
  state
} from 'src/state/bobquestStore';

const props = defineProps<{ mission: StarterMission | null }>();

const answerValue = computed(() => (props.mission ? missionAnswer(props.mission.id) : null));
const result = computed(() => missionResult(props.mission?.id));
const error = computed(() => missionError(props.mission?.id));
const choiceOptions = computed(() => {
  if (!props.mission) return [];
  const interaction = props.mission.interaction;
  if (interaction.type !== 'single_choice' && interaction.type !== 'multi_choice') return [];
  return interaction.options.map((option) => ({ label: option.label, value: option.id }));
});
const fileFocusOptions = computed(() => {
  if (!props.mission || props.mission.interaction.type !== 'file_focus') return [];
  return props.mission.interaction.required_paths.map((path) => ({ label: path, value: path }));
});

function confirmUnderstanding() {
  if (!props.mission) return;
  setMissionAnswer(props.mission.id, true);
  void completeActiveClosedMission();
}
</script>
