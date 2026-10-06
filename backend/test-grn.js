const testGRN = async () => {
    try {
        console.log("📦 Sending GRN request to server...");
        
        const response = await fetch('http://localhost:5000/api/inventory/grn/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Ensure this PO ID exists in your database!
                purchaseOrderId: "382c3528-a49c-439b-aebb-1185ad04479a", 
                items: [
                    {
                        variantId: "d98ab246-1b04-4957-ac5a-3c7c302ec8b2",
                        quantity: 3, 
                        rackId: "bd596b68-a13b-4df1-a615-26f81b72da4a" // Using your first valid Rack ID
                    }
                ]
            })
        });

        const data = await response.json();
        console.log("Server Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Fetch error:", error);
    }
};

testGRN();