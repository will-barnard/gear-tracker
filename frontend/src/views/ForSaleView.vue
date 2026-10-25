<template>
  <div>
    <NavBar />
    <main class="page">
      <ItemsList
        title="For sale"
        filter-by-status="for_sale"
        empty-message="Nothing for sale. Set an item's status to For sale and it shows up here."
      />
    </main>
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import ItemsList from '@/components/ItemsList.vue'
</script>
