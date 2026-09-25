import React, { useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { setAccessToken } from '../api';

export default function ManagerLogin({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            // Use the gateway so the manager requires only its own CORS origin there.
            const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            if (typeof data.token !== 'string') throw new Error('Login did not return an access token');
            setAccessToken(data.token);
            setPassword('');
            onLogin();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Sign in failed');
        } finally {
            setBusy(false);
        }
    }
    return <Box component="form" onSubmit={submit} sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography>Sign in to manage your restaurants or submit reviews.</Typography>
        <TextField label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
        <TextField label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        <Button type="submit" disabled={busy}>Sign in</Button>
        {error && <Alert severity="error">{error}</Alert>}
    </Box>;
}
