export const transitionSalesOrder = (currentStatus, targetStatus) => {
    const validTransitions = {
        'DRAFT': ['PENDING', 'CANCELLED'],
        'PENDING': ['VALIDATED', 'CANCELLED'],
        'VALIDATED': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [], // Final state
        'CANCELLED': []  // Final state
    };

    if (validTransitions[currentStatus]?.includes(targetStatus)) {
        return true;
    }
    throw new Error(`Invalid transition: ${currentStatus} to ${targetStatus}`);
};