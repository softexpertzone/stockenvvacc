import { prisma } from '@/lib/prisma';

export async function logAction(tx, { entity, entityId, action, operation, newValue, reason = null, userId = 'SYSTEM', meta = {} }) {
    try {
        // We pass 'tx' (the transaction client) so this happens in the same block as the main operation
        await tx.auditLog.create({
            data: {
                entity,
                entityId,
                action,
                operation,
                newValue, // Now a JSON object
                reason,
                userId,
                meta,
            },
        });
    } catch (error) {
        console.error("Audit Logging Failed:", error);
        // Depending on your requirements, you might want to 'throw' here to rollback the whole transaction
        throw new Error("Audit log failed");
    }
}