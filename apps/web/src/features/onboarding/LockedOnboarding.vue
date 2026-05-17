<template>
  <q-card flat bordered class="bq-control-surface bq-locked-surface">
    <div class="bq-section-kicker">Onboarding locked</div>
    <div class="bq-card-title">No run is ready yet.</div>
    <p class="bq-muted bq-measure">
      BobQuest does not render generated training content unless IBM Bob Shell returns a valid analysis result through the runtime API.
    </p>
    <q-btn no-caps class="bq-action-btn q-mt-md" color="primary" unelevated icon-right="arrow_forward" label="Go to runtime entry" to="/dev" />
  </q-card>
</template>
