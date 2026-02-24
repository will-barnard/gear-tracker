<template>
  <div class="items-view">
    <NavBar />
    
    <div class="container">
      <ItemsList title="Items" />
    </div>
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import ItemsList from '@/components/ItemsList.vue'
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

@media (min-width: 769px) {
  .container {
    padding: 2rem;
  }
}
</style>
