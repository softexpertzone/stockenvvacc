import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        cartItems: [],
    },
    reducers: {
        addToCart: (state, action) => {
            const newItem = action.payload;
            const addAmount = newItem.quantity || 1;

            const existingItem = state.cartItems.find((item) => item.id === newItem.id);

            if (existingItem) {
                existingItem.quantity += addAmount;
            } else {
                state.cartItems.push({
                    ...newItem,
                    quantity: addAmount,
                });
            }
        },
        removeFromCart: (state, action) => {
            const id = action.payload;
            state.cartItems = state.cartItems.filter(item => item.id !== id);
        }
    },
});

export const { addToCart, removeFromCart } = cartSlice.actions;
export default cartSlice.reducer;