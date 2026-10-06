const prisma = require('../lib/prisma');

// Create a new Attribute (e.g., "Color") with multiple values
const createAttribute = async (req, res) => {
    try {
        const { name, values } = req.body; // values: [{value: "Beige", hexCode: "#F5F5DC"}]

        const attribute = await prisma.attributeDefinition.create({
            data: {
                name,
                values: {
                    create: values.map(v => ({
                        value: v.value,
                        hexCode: v.hexCode
                    }))
                }
            },
            include: { values: true }
        });

        res.status(201).json(attribute);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all attributes for the dynamic form
const getAllAttributes = async (req, res) => {
    try {
        const attributes = await prisma.attributeDefinition.findMany({
            include: { values: true }
        });
        res.json(attributes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createAttribute, getAllAttributes };