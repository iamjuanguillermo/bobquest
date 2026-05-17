<template>
  <q-layout view="hHh lpR fFf" class="bq-public-shell">
    <q-header class="bq-public-topbar">
      <q-toolbar class="bq-public-toolbar">
        <q-avatar rounded class="bq-brand-mark" icon="explore" />
        <q-toolbar-title>
          <div class="text-weight-bold">BobQuest</div>
          <div class="text-caption bq-public-muted">IBM Bob-powered repo onboarding</div>
        </q-toolbar-title>
        <ThemeToggle />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="bq-route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import ThemeToggle from 'src/components/ThemeToggle.vue';
</script>
