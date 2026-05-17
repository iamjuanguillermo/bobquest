<template>
  <q-card flat bordered class="bq-control-surface bq-mission-surface">
    <div class="bq-section-kicker">Starter mission</div>
    <div class="bq-card-title">{{ mission?.title ?? 'No starter mission returned' }}</div>

    <div v-if="activeFlow && activeFlow.starter_missions.length > 1" class="bq-step-tabs q-mt-md">
      <button
        v-for="item in activeFlow.starter_missions"
        :key="item.id"
        type="button"
        class="bq-step-tab"
        :class="{ 'is-active': item.id === mission?.id }"
        @click="selectMission(item.id)"
      >
        {{ item.title }}
      </button>
    </div>

    <template v-if="mission">
      <p class="bq-muted bq-measure">{{ mission.why_enabled }}</p>

      <div class="bq-mission-grid q-mt-lg">
        <div>
          <div class="bq-small-label">Files to understand</div>
          <div class="bq-token-stack">
            <q-chip v-for="file in mission.files_to_understand" :key="file.path" dense class="bq-code-chip" :label="file.path" />
            <span v-if="mission.files_to_understand.length === 0" class="bq-muted text-caption">IBM Bob did not require extra file focus for this mission.</span>
          </div>
        </div>

        <div>
          <div class="bq-small-label">Validation commands</div>
          <div class="bq-token-stack">
            <q-chip v-for="check in mission.validation_commands" :key="check.command" dense class="bq-code-chip" :label="check.command" />
            <span v-if="mission.validation_commands.length === 0" class="bq-muted text-caption">No validation command was returned for this mission.</span>
          </div>
        </div>
      </div>

      <q-separator class="q-my-lg" />
      <InteractionRenderer :mission="mission" />
    </template>

    <template v-else>
      <p class="bq-muted bq-measure">The runtime analysis did not return a starter mission for the active flow.</p>
    </template>
  </q-card>
</template>

<script setup lang="ts">
import { activeFlow, activeMission, selectMission } from 'src/state/bobquestStore';
import InteractionRenderer from './InteractionRenderer.vue';

const mission = activeMission;
</script>
