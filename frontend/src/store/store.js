import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './inventorySlice';
import cartReducer from './cartSlice';

export const store = configureStore({
    reducer: {
        inventory: inventoryReducer,
        cart: cartReducer,
    },
});