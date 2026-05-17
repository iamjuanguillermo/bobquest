<template>
  <q-btn no-caps
    flat
    dense
    round
    :icon="state.ui.darkMode ? 'light_mode' : 'dark_mode'"
    :aria-label="state.ui.darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  />
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';
import { useQuasar } from 'quasar';
import { state, toggleDarkMode } from 'src/state/bobquestStore';

const $q = useQuasar();

watchEffect(() => {
  $q.dark.set(state.ui.darkMode);
});

function toggle() {
  toggleDarkMode();
}
</script>
