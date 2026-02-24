<template>
  <div class="for-sale-view">
    <NavBar />
    
    <div class="container">
      <ItemsList 
        title="🏷️ For Sale" 
        filter-by-status="for_sale"
        empty-message="No items for sale. Items with 'For Sale' status will appear here."
      />
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
