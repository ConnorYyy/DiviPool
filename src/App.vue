<template>
  <div class="app-container">
    <router-view />
    <van-tabbar v-if="showTabbar" route safe-area-inset-bottom>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/portfolio" icon="chart-trending-o">持仓</van-tabbar-item>
      <van-tabbar-item to="/calendar" icon="calendar-o">日历</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const showTabbar = computed(() => {
  return route.meta.showTabbar !== false && userStore.isLoggedIn
})
</script>

<style>
.app-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}
</style>
