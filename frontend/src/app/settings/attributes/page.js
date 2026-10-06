'use client';

import { useState } from 'react';

// Temporarily comment out the missing API import:
// import { attributeApi } from '@/features/settings/api/attributeApi';

export default function AttributeMaster() {
    const [name, setName] = useState('');

    return (
        <div style={{ padding: '20px' }}>
            <h1>Attributes Settings</h1>
            <p>This page is currently undergoing maintenance.</p>
        </div>
    );
}