import React, { FormEvent, useState } from 'react';
import './admin-login.scss';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                window.location.href = '/admin';
            } else {
                setError(data.error || 'Login failed. Please try again.');
            }
        } catch {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='admin-login'>
            <div className='admin-login__card'>
                <div className='admin-login__logo'>
                    <span className='admin-login__logo-icon'>🛡</span>
                    <h1 className='admin-login__title'>Admin Portal</h1>
                    <p className='admin-login__subtitle'>Sign in to access the admin panel</p>
                </div>

                <form className='admin-login__form' onSubmit={handleSubmit} noValidate>
                    {error && (
                        <div className='admin-login__error' role='alert'>
                            {error}
                        </div>
                    )}

                    <div className='admin-login__field'>
                        <label htmlFor='username' className='admin-login__label'>
                            Username
                        </label>
                        <input
                            id='username'
                            type='text'
                            className='admin-login__input'
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete='username'
                            autoFocus
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className='admin-login__field'>
                        <label htmlFor='password' className='admin-login__label'>
                            Password
                        </label>
                        <input
                            id='password'
                            type='password'
                            className='admin-login__input'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete='current-password'
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type='submit' className='admin-login__btn' disabled={loading || !username || !password}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
