// src/store/inventorySlice.js
import { createSlice } from '@reduxjs/toolkit';

const inventorySlice = createSlice({
    name: 'inventory',
    initialState: {
        balances: [],
        transferItems: [], // Track items being planned for transfer
    },
    reducers: {
        // 1. Initialize stock when the page loads
        setInitialStock: (state, action) => {
            state.balances = action.payload;
        },

        // 2. Synchronize the state after a successful transfer API call
        applyTransferSync: (state, action) => {
            const { sourceBinId, variantId, qty } = action.payload;
            // Find the balance record and decrement the allocated/current count
            const balance = state.balances.find(b => b.binId === sourceBinId && b.productVariantId === variantId);
            if (balance) {
                balance.currentCount -= qty;
                balance.allocatedCount -= qty;
            }
        },

        setBalances: (state, action) => {
            state.balances = action.payload;
        },

        clearBalances: (state) => {
            state.balances = [];
        }
    },
});

// IMPORTANT: Ensure you export them here!
export const {
    setInitialStock,
    applyTransferSync,
    setBalances,
    clearBalances
} = inventorySlice.actions;

export default inventorySlice.reducer;