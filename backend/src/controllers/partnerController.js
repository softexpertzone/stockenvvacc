import prisma from '../lib/prisma.js';

/**
 * 1. GET Partners
 * Returns an array of partners, optionally filtered by type.
 * Frontend expects: { success: true, data: [...] }
 */
export const getPartners = async (req, res) => {
    try {
        const { type } = req.query;
        const whereClause = type ? { type: type.toUpperCase() } : {};

        console.log("🔍 Filtering Partners with:", whereClause); // DEBUG LOG

        const partners = await prisma.partner.findMany({
            where: whereClause,
            orderBy: { companyName: 'asc' },
            select: {
                id: true,
                name: true,
                companyName: true,
                type: true,
                phone: true,
                email: true
            }
        });

        console.log("📊 Records Found:", partners.length); // DEBUG LOG

        res.status(200).json({ success: true, data: partners || [] });
    } catch (error) {
        console.error("❌ DB FETCH ERROR:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch partners: " + error.message });
    }
};

/**
 * 2. REGISTER Partner
 * Creates a new business entity (Vendor/Buyer) with audit logging.
 */
export const registerPartner = async (req, res) => {
    try {
        const {
            type, companyName, name, phone, email, address,
            creditLimit, bankName, accountNo, ifscCode, taxId
        } = req.body;

        // Validation
        if (!type || !companyName || !phone || !address) {
            return res.status(400).json({ success: false, error: "Missing required fields." });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create Partner
            const partner = await tx.partner.create({
                data: {
                    type: type.toUpperCase(),
                    companyName,
                    name,
                    phone,
                    email,
                    address,
                    creditLimit: parseFloat(creditLimit) || 0.00,
                    bankName,
                    accountNo,
                    ifscCode,
                    taxId,
                    balance: 0.00
                }
            });

            // Audit Log
            await tx.auditLog.create({
                data: {
                    entity: 'PARTNER',
                    entityId: partner.id,
                    action: 'REGISTER_PARTNER',
                    operation: 'INSERT',
                    newValue: JSON.stringify(partner),
                    userId: req.user?.id || 'SYSTEM_USER'
                }
            });

            return partner;
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        // Handle database unique constraints (like phone number)
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, error: "Phone number already exists." });
        }
        console.error("❌ PARTNER REGISTRATION ERROR:", error);
        res.status(500).json({ success: false, error: "Failed to register partner: " + error.message });
    }
};