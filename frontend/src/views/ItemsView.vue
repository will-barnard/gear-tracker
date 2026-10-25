<template>
  <div>
    <NavBar />
    <main class="page">
      <ItemsList title="Items" />
    </main>
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import ItemsList from '@/components/ItemsList.vue'
</script>
