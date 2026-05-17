<template>
  <q-card flat bordered class="bq-control-surface">
    <div class="bq-section-kicker">Runtime entry</div>
    <div class="bq-card-title">Run IBM Bob analysis</div>
    <p class="bq-muted bq-measure">
      Choose one repository target. BobQuest opens the onboarding surface only after the runtime produces a valid run state.
    </p>

    <div class="bq-input-stack">
      <template v-if="state.capabilities.publicDemoMode">
        <q-select
          :model-value="state.run.selectedRepoId"
          :options="repoOptions"
          label="Approved repository"
          outlined
          dense
          emit-value
          map-options
          @update:model-value="onSelectRepo"
        />
        <q-banner rounded dense class="bg-red-1 text-negative bq-restriction-banner">
          <template #avatar><q-icon name="lock" /></template>
          Public restricted mode is enabled. This deployment only accepts approved repositories and limited runtime usage.
        </q-banner>
      </template>

      <template v-else>
        <q-input
          :model-value="state.run.repoUrl"
          label="GitHub repository URL"
          placeholder="https://github.com/owner/repository"
          outlined
          dense
          clearable
          @update:model-value="onRepoUrl"
        />
      </template>

      <div v-if="repoUrl" class="bq-repo-hint">
        <span class="bq-mono">{{ repoUrl }}</span>
        <q-btn no-caps flat dense round icon="open_in_new" :href="repoUrl" target="_blank" rel="noopener noreferrer" aria-label="Open repository" />
      </div>
    </div>

    <q-separator class="q-my-lg" />

    <div class="bq-primary-action-row">
      <q-btn
        no-caps
        class="bq-action-btn"
        color="primary"
        unelevated
        icon="psychology"
        label="Run IBM Bob analysis"
        :disable="!repoUrl || state.ui.requestingRun || state.run.status === 'running_bob_analysis'"
        @click="requestRuntimeRun"
      />
      <div class="text-caption bq-muted">
        Runtime API validates the target, clones the repo, invokes IBM Bob Shell, and stores run state.
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { state, selectAllowedRepo, setSelfHostedRepoUrl, selectedRepo, requestRuntimeRun } from 'src/state/bobquestStore';

const repoOptions = computed(() => state.capabilities.allowedRepos.map((repo) => ({ label: repo.label, value: repo.id })));
const repoUrl = computed(() => selectedRepo()?.url ?? state.run.repoUrl);

function onSelectRepo(value: string) {
  selectAllowedRepo(value);
}

function onRepoUrl(value: string | number | null) {
  setSelfHostedRepoUrl(String(value ?? ''));
}
</script>
