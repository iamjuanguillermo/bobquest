<template>
  <q-page class="bq-page-shell">
    <section class="bq-hero-surface">
      <div class="bq-hero-copy">
        <q-chip class="bq-soft-chip" icon="psychology" label="Flow-guided developer onboarding" />
        <div class="bq-page-title">Understand the repo. Start with the right mission.</div>
        <p class="bq-hero-text">
          BobQuest uses IBM Bob Shell as the runtime brain to turn a GitHub repository into a focused onboarding path built around operational repo flows.
        </p>
        <div class="bq-hero-actions">
          <q-btn no-caps class="bq-action-btn" color="primary" unelevated icon-right="arrow_forward" label="Analyze repository" to="/dev" />
        </div>
      </div>

      <q-card flat bordered class="bq-sequence-card">
        <div class="bq-sequence-step is-active">
          <q-icon name="hub" />
          <div>
            <div class="text-weight-bold">Repo target</div>
            <div class="text-caption bq-muted">Approved public target or self-hosted GitHub URL.</div>
          </div>
        </div>
        <div class="bq-sequence-line" />
        <div class="bq-sequence-step">
          <q-icon name="psychology" />
          <div>
            <div class="text-weight-bold">IBM Bob Shell runtime</div>
            <div class="text-caption bq-muted">Real analysis, strict JSON contract, clear failure.</div>
          </div>
        </div>
        <div class="bq-sequence-line" />
        <div class="bq-sequence-step">
          <q-icon name="route" />
          <div>
            <div class="text-weight-bold">Flow walkthrough</div>
            <div class="text-caption bq-muted">Steps, evidence, checks, and starter mission.</div>
          </div>
        </div>
      </q-card>
    </section>
  </q-page>
</template>
