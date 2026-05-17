<template>
  <q-page class="bq-page-shell">
    <section class="bq-runtime-grid">
      <div class="bq-runtime-main">
        <RepoRunPanel />
      </div>
      <aside class="bq-runtime-side">
        <BobStatusBanner />
        <RunStatusPanel />
      </aside>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import BobStatusBanner from 'src/components/BobStatusBanner.vue';
import RepoRunPanel from 'src/features/repo-run/RepoRunPanel.vue';
import RunStatusPanel from 'src/features/repo-run/RunStatusPanel.vue';
import { loadCapabilities } from 'src/state/bobquestStore';

onMounted(() => {
  void loadCapabilities();
});
</script>
