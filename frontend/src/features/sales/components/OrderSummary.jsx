'use client';
import React from 'react';

export default function OrderSummary({ cart = [] }) {
    // 1. Calculate the math
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const discount = cart.reduce((acc, item) => acc + (item.discount || 0), 0);
    const taxRate = 0.18; // 18% Tax
    const tax = (subtotal - discount) * taxRate;
    const grandTotal = subtotal - discount + tax;

    return (
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm sticky top-6">
            <h2 className="font-bold text-gray-900 mb-6 text-lg">Order Summary</h2>

            <div className="space-y-4 text-gray-700 text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="font-bold text-red-600">-{discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax (18%)</span>
                    <span className="font-bold text-gray-900">{tax.toFixed(2)}</span>
                </div>

                <hr className="border-gray-200" />

                <div className="flex justify-between font-bold text-lg text-blue-700">
                    <span>Grand Total</span>
                    <span>{grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}