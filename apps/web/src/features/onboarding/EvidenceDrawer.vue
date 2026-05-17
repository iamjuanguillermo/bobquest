<template>
  <q-drawer
    :model-value="state.ui.onboarding.evidenceDrawerOpen"
    side="right"
    overlay
    bordered
    :width="420"
    class="bq-detail-drawer"
    @update:model-value="onUpdate"
  >
    <div class="bq-drawer-content">
      <div class="bq-drawer-topline">
        <div>
          <div class="bq-section-kicker">Evidence</div>
          <div class="bq-drawer-title">Files and checks</div>
        </div>
        <q-btn no-caps flat round dense icon="close" aria-label="Close evidence" @click="closeEvidenceDrawer" />
      </div>

      <template v-if="activeStep">
        <div class="bq-small-label q-mt-lg">Files</div>
        <q-list bordered separator class="bq-drawer-list">
          <q-item v-for="file in activeStep.files" :key="file.path">
            <q-item-section>
              <q-item-label class="bq-mono">{{ file.path }}</q-item-label>
              <q-item-label caption>{{ file.reason }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="bq-small-label q-mt-lg">Tests and commands</div>
        <q-list bordered separator class="bq-drawer-list">
          <q-item v-for="check in activeStep.tests" :key="check.command">
            <q-item-section>
              <q-item-label class="bq-mono">{{ check.command }}</q-item-label>
              <q-item-label caption>{{ check.reason }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="bq-small-label q-mt-lg">IBM Bob evidence</div>
        <q-list bordered separator class="bq-drawer-list">
          <q-item v-for="item in activeStep.evidence" :key="item.path">
            <q-item-section>
              <q-item-label class="bq-mono">{{ item.path }}</q-item-label>
              <q-item-label caption>{{ item.reason }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </template>
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { activeStep, closeEvidenceDrawer, state } from 'src/state/bobquestStore';

function onUpdate(value: boolean) {
  if (!value) closeEvidenceDrawer();
}
</script>
