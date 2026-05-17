import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/pages/IndexPage.vue')
  },
  {
    path: '/dev',
    component: () => import('src/pages/DevPage.vue')
  },
  {
    path: '/onboarding',
    component: () => import('src/pages/OnboardingPage.vue')
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/'
  }
];

export default routes;
